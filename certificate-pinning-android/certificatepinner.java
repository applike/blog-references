 public class CertificatePinningClientFactory implements OkHttpClientFactory {

    @Override
    public OkHttpClient createNewNetworkModuleClient(){
        String hostName = “...”;
        String certificatePublicKey = “...”;
        OkHttpClient.Builder clientBuilder = new OkHttpClient.Builder();
        CertificatePinner.Builder()
            .add(hostName, certificatePublicKey)
            .build();
        clientBuilder.certificatePinner(CertificatePinningClientFactory.getCertificatePinner());
        clientBuilder.cookieJar(new ReactCookieJarContainer());
        return clientBuilder.build();
    }
}
