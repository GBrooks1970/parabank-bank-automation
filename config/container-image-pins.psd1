@{
    # Docker Official Image. Multi-platform index resolved and reviewed 2026-08-01.
    MavenBuilder = @{
        Tag    = 'maven:3.9.16-eclipse-temurin-17-noble'
        Digest = 'sha256:1ed5d1f54416b706707b4f3238f63a20bb06aab27c6d240090a2bb9ad895ed45'
    }

    # Docker Official Image. Matches the FROM tag in parasoft/parabank@d1bf006.
    # Multi-platform index resolved and reviewed 2026-08-01.
    ParaBankRuntime = @{
        Tag    = 'tomcat:10.1.57-jre21-temurin-noble'
        Digest = 'sha256:f6e69a64d90e3b71b22e77fdfa87b3df9fa86be393cd01912e9bf34d0076b335'
    }
}
