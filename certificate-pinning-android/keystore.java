//Create a KeyStore containing our trusted CAs
String keyStoreType = KeyStore.getDefaultType();
KeyStore keyStore = KeyStore.getInstance(keyStoreType);
keyStore.load(null, null);
for(int i = 0; i <certificates.size(); i++){
    keyStore.setCertificateEntry("ca" + i, certificates.get(i));
}

