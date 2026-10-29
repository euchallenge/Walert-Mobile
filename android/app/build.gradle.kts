plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
}

// The web app in ../../web is the single source of truth; it is copied in as assets at build time.
// Raw layer sources (web/data/src/*.geojson) are left out: data/layers.js already holds them.
// -Paudience=public packages the staged public edition (build/web-public, from tools/build_public.py)
// as a separate app (".public" id), so both editions can sit on one phone.
val publicEdition = providers.gradleProperty("audience").orNull == "public"
val webSource = rootDir.resolve(if (publicEdition) "../build/web-public" else "../web")
val webAssets = layout.buildDirectory.dir("webAssets")
val syncWeb by tasks.registering(Sync::class) {
    inputs.property("audience", publicEdition)
    from(webSource) {
        exclude("data/src/**/*.geojson", "data/src/layers.json", "content.public.js")
    }
    into(webAssets.map { it.dir("web") })
}

android {
    namespace = "org.aic.policytool"
    compileSdk = 36

    defaultConfig {
        applicationId = "org.aic.policytool"
        minSdk = 26
        targetSdk = 36
        versionCode = 1
        versionName = "0.1"
        manifestPlaceholders["appLabel"] = if (publicEdition) "Policy Tool (public)" else "@string/app_name"
        if (publicEdition) {
            applicationIdSuffix = ".public"
            versionNameSuffix = "-public"
        }
    }

    sourceSets["main"].assets.srcDir(webAssets)

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

// Compile with whatever JDK runs Gradle (17 or 21), emitting Java 17 bytecode.
kotlin {
    compilerOptions {
        jvmTarget.set(org.jetbrains.kotlin.gradle.dsl.JvmTarget.JVM_17)
    }
}

tasks.named("preBuild") { dependsOn(syncWeb) }

dependencies {
    implementation("androidx.webkit:webkit:1.14.0")
}
