---
cover: false
title: Improve your Android build times
description: 'Simple things you can do to improve your gradle/android build time a lot'
date:   2016-04-05 20:10:00
tags: ['android', 'gradle']
---

If you have the time to watch the video, go ahead. [Madis Pink](https://twitter.com/madisp) goes over each optimisation you can do very carefully and how you can profile the gradle build process to identify the bottlenecks of your builds. If not, go ahead do the changes mentioned below, which will take less than two minutes and enjoy a much smaller build times.
  
<iframe width="560" height="315" src="https://www.youtube.com/embed/AbNhen_zn-c" frameborder="0" allowfullscreen></iframe>

## Optimisations

#### The minSdk 21 trick
It doesn't matter your app is over the 65K method limit or not, enabling multiDex and having product flavors like this help a lot.  

```groovy
productFlavors {
    dev {
        multiDexEnabled true
        minSdkVersion 21
    }
    prod {
        multiDexEnabled true
        minSdkVersion 15
    }
}
```
  
And also keep in mind that **Instant Run** has [some overhead](https://twitter.com/tornorbye/status/717446584284241921) on the dex method count in your debug builds, which might just make your method count go over the limit.
  
On my machine for my project 
`./gradlew :app:assembleProdDebug` takes **55.623s** and `./gradlew :app:assembleDevDebug` takes **12.41s**!

So yeah. Do it.

#### Use a Daemon
Using a daemon essentially means, gradle keeps a JVM and gradle instance running after the first build and reuses the same for subsequent builds. Android Studio **already uses a daemon** for every build that is triggered from the IDE, but this is very useful for builds triggered from the command line.

**Dry Run** without daemon

```sh
./gradlew :app:assembleDebug --dry-run
```

Output:

```
BUILD SUCCESSFUL

Total time: 11.657 secs

This build could be faster, please consider using the Gradle Daemon: https://docs.gradle.org/2.10/userguide/gradle_daemon.html
```

#### Enabling gradle daemon
In your `~/.gradle/gradle.properties`

```
org.gradle.daemon=true
```

**Dry Run output after enabling daemon**

```
BUILD SUCCESSFUL

Total time: 1.757 secs
```

#### Upgradle your gradle version
The gradle team is constantly optimising the build performance and it is wise to be using the latest version for the best performance. Here is how you change it  
In `<Project Root>/gradle/wrapper/`  
Edit `gradle-wrapper.properties` and upgrade gradle `distributionUrl` to the [latest](http://gradle.org/gradle-download/).
> The difference will be substantially good if you are upgrading from or below `2.4`

#### Use JDK 8 
Groovy, being a dynamic language, can really benifit from the `invoke dynamic` instruction in Java 7 and above. So using JDK7 or JDK8 will certainly be helpful.

* Download and install [JDK 8](http://www.oracle.com/technetwork/java/javase/downloads/jdk8-downloads-2133151.html)
* `Cmd+Shift+A` or `Ctrl+Shift+A`, type `Project Structure` and change `JDK Location` to JDK 8 location

#### Parallel Execution
If you have modules that are standalone, you can improve the build time a bit by enabling parallel execution.  
In your `./gradle/gradle.properties` or `<Project Root>/gradle.properties`, add this line

```
org.gradle.parallel=true
```

## Common Pitfalls
#### Dynamic dependencies
Use definite version numbers for your dependencies in your gradle

```groovy
//Do NOT do this
compile 'com.google.code.gson:gson:2.+'

//Do this instead
compile 'com.google.code.gson:gson:2.3'
```
This avoids the problem of gradle always making a network request to check for the latest version of the dependency

#### Avoid heavy computation
You can find snippets like this on stack overflow that aim to make versioning easier for you

```groovy
def cmd = 'git rev-list HEAD --first-parent --count'
def gitVersion = cmd.execute().text.trim().toInteger()

android {
  defaultConfig {
    versionCode gitVersion
  }
}
```
The problem with this code is - gradle needs to count the number of commits for every build. For a large repo which has around `20000` commits, it takes around **half a second** to just count the number of commits.

#### That's it
After these optimisations your first build might take the same amount of time, but trust me your **subsequent builds will be much faster** overall. 

Also there is one more very important optimisation you can do

#### Get an SSD
Please do.
