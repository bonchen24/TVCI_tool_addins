import datetime
import ipaddress
import os
from cryptography import x509
from cryptography.x509.oid import NameOID, ExtendedKeyUsageOID
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
import cryptography.hazmat.primitives.serialization.pkcs12 as p12

def generate():
    root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    release_dir = os.path.join(root_dir, 'release')
    os.makedirs(release_dir, exist_ok=True)

    ca_crt_path = os.path.join(release_dir, 'ca.crt')
    pfx_path = os.path.join(release_dir, 'tvci-cert.pfx')

    ca_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    ca_name = x509.Name([
        x509.NameAttribute(NameOID.COUNTRY_NAME, 'VN'),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, 'TVCI - IEMM'),
        x509.NameAttribute(NameOID.COMMON_NAME, 'TVCI Local Addin Root CA')
    ])
    ca_cert = (
        x509.CertificateBuilder()
        .subject_name(ca_name)
        .issuer_name(ca_name)
        .public_key(ca_key.public_key())
        .serial_number(1)
        .not_valid_before(datetime.datetime(2020, 1, 1, 0, 0, 0))
        .not_valid_after(datetime.datetime(2050, 1, 1, 0, 0, 0))
        .add_extension(x509.BasicConstraints(ca=True, path_length=None), critical=True)
        .add_extension(
            x509.KeyUsage(
                digital_signature=True,
                content_commitment=False,
                key_encipherment=False,
                data_encipherment=False,
                key_agreement=False,
                key_cert_sign=True,
                crl_sign=True,
                encipher_only=False,
                decipher_only=False
            ),
            critical=True
        )
        .add_extension(x509.SubjectKeyIdentifier.from_public_key(ca_key.public_key()), critical=False)
        .sign(ca_key, hashes.SHA256())
    )

    server_key = rsa.generate_private_key(public_exponent=65537, key_size=2048)
    server_name = x509.Name([
        x509.NameAttribute(NameOID.COUNTRY_NAME, 'VN'),
        x509.NameAttribute(NameOID.ORGANIZATION_NAME, 'TVCI - IEMM'),
        x509.NameAttribute(NameOID.COMMON_NAME, 'localhost')
    ])
    server_cert = (
        x509.CertificateBuilder()
        .subject_name(server_name)
        .issuer_name(ca_name)
        .public_key(server_key.public_key())
        .serial_number(2)
        .not_valid_before(datetime.datetime(2020, 1, 1, 0, 0, 0))
        .not_valid_after(datetime.datetime(2050, 1, 1, 0, 0, 0))
        .add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True)
        .add_extension(
            x509.KeyUsage(
                digital_signature=True,
                content_commitment=False,
                key_encipherment=True,
                data_encipherment=False,
                key_agreement=False,
                key_cert_sign=False,
                crl_sign=False,
                encipher_only=False,
                decipher_only=False
            ),
            critical=True
        )
        .add_extension(
            x509.ExtendedKeyUsage([ExtendedKeyUsageOID.SERVER_AUTH, ExtendedKeyUsageOID.CLIENT_AUTH]),
            critical=False
        )
        .add_extension(
            x509.SubjectAlternativeName([
                x509.DNSName('localhost'),
                x509.IPAddress(ipaddress.IPv4Address('127.0.0.1')),
                x509.IPAddress(ipaddress.IPv6Address('::1'))
            ]),
            critical=False
        )
        .add_extension(x509.AuthorityKeyIdentifier.from_issuer_public_key(ca_key.public_key()), critical=False)
        .sign(ca_key, hashes.SHA256())
    )

    pfx_bytes = p12.serialize_key_and_certificates(
        name=b'localhost',
        key=server_key,
        cert=server_cert,
        cas=[ca_cert],
        encryption_algorithm=serialization.BestAvailableEncryption(b'tvci123456')
    )

    with open(ca_crt_path, 'wb') as f:
        f.write(ca_cert.public_bytes(serialization.Encoding.PEM))

    with open(pfx_path, 'wb') as f:
        f.write(pfx_bytes)

    print('[OK] Da tao xong ca.crt va tvci-cert.pfx (2020 - 2050)')

if __name__ == '__main__':
    generate()
