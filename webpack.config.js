const path = require("path");
const fs = require("fs");
const os = require("os");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const devCerts = require("office-addin-dev-certs");

function getExistingHttpsOptions() {
  const certificateDirectory = path.join(os.homedir(), ".office-addin-dev-certs");
  const keyPath = path.join(certificateDirectory, "localhost.key");
  const certificatePath = path.join(certificateDirectory, "localhost.crt");
  if (!fs.existsSync(keyPath) || !fs.existsSync(certificatePath)) return null;
  return {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certificatePath),
  };
}

async function getHttpsOptions() {
  try {
    return await devCerts.getHttpsServerOptions();
  } catch (error) {
    const existingOptions = getExistingHttpsOptions();
    if (existingOptions) return existingOptions;
    throw error;
  }
}

module.exports = async (_env, argv) => {
  const config = {
    target: ["web", "es5"],
    devtool: argv.mode === "development" ? "source-map" : false,
    entry: {
      taskpane: "./src/taskpane/index.tsx",
      dialog: "./src/dialog/index.tsx",
      commands: "./src/commands/commands.ts",
    },
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: "[name].js",
      clean: true,
      environment: {
        arrowFunction: false,
        const: false,
        destructuring: false,
        forOf: false,
      },
    },
    resolve: { extensions: [".ts", ".tsx", ".js"] },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: {
            loader: "ts-loader",
            options: {
              compilerOptions: { noEmit: false },
            },
          },
          exclude: /node_modules/,
        },
        { test: /\.css$/, use: ["style-loader", "css-loader"] },
      ],
    },
    plugins: [
      new HtmlWebpackPlugin({ template: "./src/taskpane/index.html", filename: "taskpane.html", chunks: ["taskpane"] }),
      new HtmlWebpackPlugin({ template: "./src/dialog/index.html", filename: "dialog.html", chunks: ["dialog"] }),
      new HtmlWebpackPlugin({ template: "./src/commands/commands.html", filename: "commands.html", chunks: ["commands"] }),
      new CopyWebpackPlugin({ patterns: [
        { from: "assets", to: "assets" },
        { from: "templates", to: "templates" },
      ]}),
    ],
  };

  if (argv.mode === "development") {
    config.devServer = {
      port: 38473,
      host: "localhost",
      server: { type: "https", options: await getHttpsOptions() },
      headers: { "Access-Control-Allow-Origin": "*" },
      static: [
        { directory: path.join(__dirname, "templates"), publicPath: "/templates" },
        { directory: path.join(__dirname, "dist") },
      ],
      hot: false,
      client: false,
      setupMiddlewares: (middlewares, devServer) => {
        devServer.app.post("/api/log", (req, res) => {
          let data = "";
          req.on("data", (chunk) => { data += chunk; });
          req.on("end", () => {
            try {
              fs.appendFileSync(path.join(__dirname, "debug.log"), `[${new Date().toLocaleTimeString()}] ${data}\n`);
            } catch {}
            res.writeHead(200, { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" });
            res.end('{"ok":true}');
          });
        });
        return middlewares;
      },
    };
  }

  return config;
};
