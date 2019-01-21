List<Certificate> certificates = new ArrayList<>();
CertificateFactory cf = CertificateFactory.getInstance("X.509");
InputStream inputStream = context.getAssets().open(...);
Certificate certificate = cf.generateCertificate(inputStream);
inputStream.close();
certificates.add(certificate);
