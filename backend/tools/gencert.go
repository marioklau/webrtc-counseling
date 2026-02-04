package main

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"fmt"
	"math/big"
	"net"
	"os"
	"time"
)

func main() {
	if _, err := os.Stat("certs"); os.IsNotExist(err) {
		os.Mkdir("certs", 0755)
	}

	// check if certs already exist
	if _, err := os.Stat("certs/cert.pem"); err == nil {
		fmt.Println("Certificates already exist.")
		return
	}

	max := new(big.Int).Lsh(big.NewInt(1), 128)
	serialNumber, _ := rand.Int(rand.Reader, max)

	subject := pkix.Name{
		Organization: []string{"Counseling WebRTC Dev"},
		CommonName:   "localhost",
	}

	template := x509.Certificate{
		SerialNumber: serialNumber,
		Subject:      subject,
		NotBefore:    time.Now(),
		NotAfter:     time.Now().Add(365 * 24 * time.Hour),
		KeyUsage:     x509.KeyUsageKeyEncipherment | x509.KeyUsageDigitalSignature,
		ExtKeyUsage:  []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
		IPAddresses:  []net.IP{net.ParseIP("127.0.0.1"), net.ParseIP("0.0.0.0")},
		DNSNames:     []string{"localhost"}, // Add IP-based SANs if needed, or rely on browser to warn
	}

	// Add local IPs to SANs for convenience
	addrs, _ := net.InterfaceAddrs()
	for _, addr := range addrs {
		if ipnet, ok := addr.(*net.IPNet); ok {
			if ip := ipnet.IP.To4(); ip != nil {
				template.IPAddresses = append(template.IPAddresses, ip)
			}
		}
	}

	pk, _ := rsa.GenerateKey(rand.Reader, 2048)

	derBytes, _ := x509.CreateCertificate(rand.Reader, &template, &template, &pk.PublicKey, pk)

	certOut, _ := os.Create("certs/cert.pem")
	pem.Encode(certOut, &pem.Block{Type: "CERTIFICATE", Bytes: derBytes})
	certOut.Close()

	keyOut, _ := os.Create("certs/key.pem")
	pem.Encode(keyOut, &pem.Block{Type: "RSA PRIVATE KEY", Bytes: x509.MarshalPKCS1PrivateKey(pk)})
	keyOut.Close()

	fmt.Println("Generated certs/cert.pem and certs/key.pem")
}
