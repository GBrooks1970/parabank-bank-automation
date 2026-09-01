@{
    # Docker Official Image. Multi-platform index resolved and reviewed 2026-09-01
    # (previously 2026-08-01). Base-image rebuild only: the index still reports
    # carlossg/docker-maven revision 1efa2614402e9645749d6e235c93ada60762b267 and
    # version 3.9.16-eclipse-temurin-17-noble, over eclipse-temurin:17-jdk-noble.
    MavenBuilder = @{
        Tag    = 'maven:3.9.16-eclipse-temurin-17-noble'
        Digest = 'sha256:a8746f15d5bb26b5b8bacb056cc76211553850f4c71d16aff845cfa004cbc197'
    }

    # Docker Official Image. Matches the FROM tag in parasoft/parabank@d1bf006.
    # Multi-platform index resolved and reviewed 2026-09-01 (previously 2026-08-01).
    # Base-image rebuild only: the index still reports docker-library/tomcat revision
    # 1609469c3fc33e26ee9b86820047588fb687220c and version 10.1.57-jre21-temurin-noble,
    # over eclipse-temurin:21-jre-noble.
    ParaBankRuntime = @{
        Tag    = 'tomcat:10.1.57-jre21-temurin-noble'
        Digest = 'sha256:0d187897e49c9ef3f642f52d19db7f4eab20657f4ab086e680481e10eb69d3fa'
    }
}
