using System;
using System.IO;
using System.Net;
using System.Net.Security;
using System.Net.Sockets;
using System.Security.Authentication;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Threading;
using System.Diagnostics;

namespace TvciWordToolsHost
{
    class Program
    {
        private static int _port = 38473;
        private static string _rootDir = "";
        private static string _certPath = "";
        private static string _certPass = "tvci123456";
        private static X509Certificate2 _cert;
        private static volatile bool _isRunning = true;
        private static TcpListener _listener;
        private const string MutexName = "TVCI_Word_Addin_Host_Mutex_38473";

        private static void Log(string msg)
        {
            try
            {
                string logFile = Path.Combine(Path.GetTempPath(), "tvci-host.log");
                File.AppendAllText(logFile, string.Format("[{0:yyyy-MM-dd HH:mm:ss}] {1}\r\n", DateTime.Now, msg));
            }
            catch { }
        }

        private static ManualResetEvent _stopEvent = new ManualResetEvent(false);

        private static bool InstallCaToStore(string caPath)
        {
            try
            {
                if (!File.Exists(caPath))
                {
                    Log("InstallCaToStore: File not found " + caPath);
                    return false;
                }
                X509Certificate2 caCert = new X509Certificate2(caPath);
                
                // Try LocalMachine first
                try
                {
                    using (X509Store store = new X509Store(StoreName.Root, StoreLocation.LocalMachine))
                    {
                        store.Open(OpenFlags.ReadWrite);
                        store.Add(caCert);
                        store.Close();
                    }
                    Log("Successfully installed CA to LocalMachine Root.");
                    return true;
                }
                catch (Exception exLm)
                {
                    Log("LocalMachine store write failed: " + exLm.Message + ". Trying CurrentUser...");
                }

                // Fallback to CurrentUser
                using (X509Store storeUser = new X509Store(StoreName.Root, StoreLocation.CurrentUser))
                {
                    storeUser.Open(OpenFlags.ReadWrite);
                    storeUser.Add(caCert);
                    storeUser.Close();
                }
                Log("Successfully installed CA to CurrentUser Root.");
                return true;
            }
            catch (Exception ex)
            {
                Log("InstallCaToStore failed: " + ex.ToString());
                return false;
            }
        }

        [STAThread]
        static void Main(string[] args)
        {
            string appDir = AppDomain.CurrentDomain.BaseDirectory;
            _rootDir = "";
            _certPath = "";

            for (int i = 0; i < args.Length; i++)
            {
                string arg = args[i];
                if (arg.Equals("--stop", StringComparison.OrdinalIgnoreCase))
                {
                    StopExistingHost();
                    return;
                }
                if (arg.Equals("--install-cert", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length)
                {
                    bool ok = InstallCaToStore(Path.GetFullPath(args[++i]));
                    Environment.Exit(ok ? 0 : 1);
                    return;
                }
                if (arg.Equals("--port", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length)
                {
                    int.TryParse(args[++i], out _port);
                }
                if (arg.Equals("--dir", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length)
                {
                    _rootDir = Path.GetFullPath(args[++i]);
                }
                if (arg.Equals("--cert", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length)
                {
                    _certPath = Path.GetFullPath(args[++i]);
                }
                if (arg.Equals("--pass", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length)
                {
                    _certPass = args[++i];
                }
            }

            // Smart root directory detection
            if (string.IsNullOrEmpty(_rootDir) || !Directory.Exists(_rootDir) || !File.Exists(Path.Combine(_rootDir, "taskpane.html")))
            {
                string[] candidates = new string[] {
                    appDir,
                    Path.Combine(appDir, "dist"),
                    Path.Combine(appDir, ".."),
                    Path.Combine(appDir, "..", "dist")
                };
                foreach (string c in candidates)
                {
                    if (Directory.Exists(c) && File.Exists(Path.Combine(c, "taskpane.html")))
                    {
                        _rootDir = Path.GetFullPath(c);
                        break;
                    }
                }
                if (string.IsNullOrEmpty(_rootDir)) _rootDir = appDir;
            }

            // Smart cert path detection
            if (string.IsNullOrEmpty(_certPath) || !File.Exists(_certPath))
            {
                string[] possibleCerts = new string[] {
                    Path.Combine(appDir, "tvci-cert.pfx"),
                    Path.Combine(appDir, "release", "tvci-cert.pfx"),
                    Path.Combine(_rootDir, "tvci-cert.pfx")
                };
                foreach (string c in possibleCerts)
                {
                    if (File.Exists(c)) { _certPath = c; break; }
                }
            }

            Log("Starting TVCI Host. Port=" + _port + ", Root=" + _rootDir + ", Cert=" + _certPath);

            // Ensure single instance
            bool createdNew;
            using (Mutex mutex = new Mutex(true, MutexName + "_" + _port, out createdNew))
            {
                if (!createdNew)
                {
                    Log("Another instance already running on port " + _port);
                    return;
                }

                try
                {
                    if (!File.Exists(_certPath))
                    {
                        Log("FATAL: Certificate not found at: " + _certPath);
                        return;
                    }

                    try
                    {
                        _cert = new X509Certificate2(_certPath, _certPass, X509KeyStorageFlags.UserKeySet | X509KeyStorageFlags.Exportable);
                    }
                    catch (Exception exUser)
                    {
                        Log("UserKeySet failed: " + exUser.Message + ", trying MachineKeySet...");
                        try
                        {
                            _cert = new X509Certificate2(_certPath, _certPass, X509KeyStorageFlags.MachineKeySet | X509KeyStorageFlags.Exportable);
                        }
                        catch (Exception exMachine)
                        {
                            Log("MachineKeySet failed: " + exMachine.Message + ", trying plain Exportable...");
                            _cert = new X509Certificate2(_certPath, _certPass, X509KeyStorageFlags.Exportable);
                        }
                    }

                    if (!_cert.HasPrivateKey)
                    {
                        Log("WARNING: Certificate has no private key!");
                    }

                    // Start Dual-Stack (IPv4 + IPv6) listener
                    try
                    {
                        if (Socket.OSSupportsIPv6)
                        {
                            _listener = new TcpListener(IPAddress.IPv6Any, _port);
                            try
                            {
                                _listener.Server.SetSocketOption(SocketOptionLevel.IPv6, SocketOptionName.IPv6Only, false);
                            }
                            catch { }
                            _listener.Start();
                            _listener.BeginAcceptTcpClient(OnClientAccepted, _listener);
                            Log("Listening on dual-stack https://localhost:" + _port + " (IPv4 + IPv6)");
                        }
                        else
                        {
                            _listener = new TcpListener(IPAddress.Any, _port);
                            _listener.Start();
                            _listener.BeginAcceptTcpClient(OnClientAccepted, _listener);
                            Log("Listening on IPv4 https://localhost:" + _port);
                        }
                    }
                    catch (Exception exListen)
                    {
                        Log("Dual-stack bind exception: " + exListen.Message + ". Falling back to IPv4 Loopback...");
                        _listener = new TcpListener(IPAddress.Loopback, _port);
                        _listener.Start();
                        _listener.BeginAcceptTcpClient(OnClientAccepted, _listener);
                        Log("Listening on fallback IPv4 https://127.0.0.1:" + _port);
                    }

                    _stopEvent.WaitOne();
                }
                catch (Exception ex)
                {
                    Log("Fatal error: " + ex.ToString());
                }
                finally
                {
                    if (_listener != null) { try { _listener.Stop(); } catch { } }
                }
            }
        }

        private static void OnClientAccepted(IAsyncResult ar)
        {
            TcpListener listener = (TcpListener)ar.AsyncState;
            if (!_isRunning) return;

            try
            {
                TcpClient client = listener.EndAcceptTcpClient(ar);
                ThreadPool.QueueUserWorkItem(HandleClient, client);
            }
            catch { }

            try
            {
                if (_isRunning)
                {
                    listener.BeginAcceptTcpClient(OnClientAccepted, listener);
                }
            }
            catch { }
        }

        private static void StopExistingHost()
        {
            Process current = Process.GetCurrentProcess();
            Process[] processes = Process.GetProcessesByName("tvci-host");
            foreach (Process p in processes)
            {
                if (p.Id != current.Id)
                {
                    try
                    {
                        p.Kill();
                        p.WaitForExit(3000);
                    }
                    catch { }
                }
            }
        }

        private static void HandleClient(object state)
        {
            TcpClient client = (TcpClient)state;
            client.ReceiveTimeout = 10000;
            client.SendTimeout = 10000;

            try
            {
                using (SslStream sslStream = new SslStream(client.GetStream(), false))
                {
                    try
                    {
                        sslStream.AuthenticateAsServer(_cert, false, SslProtocols.Tls12 | SslProtocols.Tls11 | SslProtocols.Tls, false);
                    }
                    catch (Exception exAuth)
                    {
                        Log("SSL Handshake failed from client: " + exAuth.Message);
                        return;
                    }

                    using (StreamReader reader = new StreamReader(sslStream, Encoding.UTF8))
                    using (BinaryWriter writer = new BinaryWriter(sslStream))
                    {
                        string line = reader.ReadLine();
                        if (string.IsNullOrEmpty(line)) return;

                        string[] parts = line.Split(' ');
                        if (parts.Length < 2) return;

                        string method = parts[0];
                        string rawUrl = parts[1];

                        // Skip remaining headers
                        while (!string.IsNullOrEmpty(reader.ReadLine())) { }

                        Log("Request: " + method + " " + rawUrl);

                        if (method.Equals("OPTIONS", StringComparison.OrdinalIgnoreCase))
                        {
                            SendResponse(writer, 204, "No Content", "text/plain", new byte[0]);
                            return;
                        }

                        if (!method.Equals("GET", StringComparison.OrdinalIgnoreCase) &&
                            !method.Equals("HEAD", StringComparison.OrdinalIgnoreCase))
                        {
                            SendResponse(writer, 405, "Method Not Allowed", "text/plain", Encoding.UTF8.GetBytes("Method Not Allowed"));
                            return;
                        }

                        // Parse url path
                        int qIdx = rawUrl.IndexOf('?');
                        string urlPath = qIdx >= 0 ? rawUrl.Substring(0, qIdx) : rawUrl;
                        urlPath = Uri.UnescapeDataString(urlPath).Replace('/', Path.DirectorySeparatorChar);
                        if (urlPath.StartsWith(Path.DirectorySeparatorChar.ToString()))
                            urlPath = urlPath.Substring(1);

                        if (urlPath.Equals("api" + Path.DirectorySeparatorChar + "health", StringComparison.OrdinalIgnoreCase) ||
                            urlPath.Equals("health", StringComparison.OrdinalIgnoreCase))
                        {
                            byte[] hBytes = Encoding.UTF8.GetBytes("{\"status\":\"ok\",\"version\":\"1.0.0\"}");
                            SendResponse(writer, 200, "OK", "application/json; charset=utf-8", hBytes);
                            Log("Response: 200 OK (health)");
                            return;
                        }

                        if (string.IsNullOrEmpty(urlPath))
                            urlPath = "taskpane.html";

                        string fullPath = Path.GetFullPath(Path.Combine(_rootDir, urlPath));

                        // Directory traversal prevention
                        string normalRoot = Path.GetFullPath(_rootDir).TrimEnd(Path.DirectorySeparatorChar) + Path.DirectorySeparatorChar;
                        if (!fullPath.StartsWith(normalRoot, StringComparison.OrdinalIgnoreCase))
                        {
                            SendResponse(writer, 403, "Forbidden", "text/plain", Encoding.UTF8.GetBytes("Forbidden"));
                            Log("Response: 403 Forbidden: " + fullPath);
                            return;
                        }

                        if (Directory.Exists(fullPath))
                        {
                            string indexFile = Path.Combine(fullPath, "taskpane.html");
                            if (File.Exists(indexFile)) fullPath = indexFile;
                        }

                        if (!File.Exists(fullPath))
                        {
                            SendResponse(writer, 404, "Not Found", "text/plain", Encoding.UTF8.GetBytes("404 Not Found: " + urlPath));
                            Log("Response: 404 Not Found: " + fullPath);
                            return;
                        }

                        byte[] fileBytes = File.ReadAllBytes(fullPath);
                        string mimeType = GetMimeType(Path.GetExtension(fullPath));
                        SendResponse(writer, 200, "OK", mimeType, fileBytes);
                        Log("Response: 200 OK " + urlPath + " (" + fileBytes.Length + " bytes)");
                    }
                }
            }
            catch (Exception ex)
            {
                Log("Client error: " + ex.Message);
            }
            finally
            {
                try { client.Close(); } catch { }
            }
        }

        private static void SendResponse(BinaryWriter writer, int statusCode, string statusText, string mimeType, byte[] content)
        {
            StringBuilder sb = new StringBuilder();
            sb.AppendFormat("HTTP/1.1 {0} {1}\r\n", statusCode, statusText);
            sb.AppendFormat("Content-Type: {0}\r\n", mimeType);
            sb.AppendFormat("Content-Length: {0}\r\n", content.Length);
            sb.Append("Access-Control-Allow-Origin: *\r\n");
            sb.Append("Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n");
            sb.Append("Access-Control-Allow-Headers: *\r\n");
            sb.Append("Cache-Control: no-cache, no-store, must-revalidate\r\n");
            sb.Append("Connection: close\r\n");
            sb.Append("\r\n");

            byte[] headerBytes = Encoding.UTF8.GetBytes(sb.ToString());
            writer.Write(headerBytes);
            if (content.Length > 0)
            {
                writer.Write(content);
            }
            writer.Flush();
        }

        private static string GetMimeType(string extension)
        {
            if (string.IsNullOrEmpty(extension)) return "application/octet-stream";
            switch (extension.ToLowerInvariant())
            {
                case ".html":
                case ".htm":
                    return "text/html; charset=utf-8";
                case ".js":
                case ".mjs":
                    return "application/javascript; charset=utf-8";
                case ".css":
                    return "text/css; charset=utf-8";
                case ".json":
                    return "application/json; charset=utf-8";
                case ".png":
                    return "image/png";
                case ".jpg":
                case ".jpeg":
                    return "image/jpeg";
                case ".gif":
                    return "image/gif";
                case ".svg":
                    return "image/svg+xml";
                case ".ico":
                    return "image/x-icon";
                case ".woff":
                    return "font/woff";
                case ".woff2":
                    return "font/woff2";
                case ".docx":
                    return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
                case ".xml":
                    return "application/xml; charset=utf-8";
                default:
                    return "application/octet-stream";
            }
        }
    }
}
