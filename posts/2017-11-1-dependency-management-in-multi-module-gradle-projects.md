---
cover: false
title: Dependency management in multi-module gradle projects
description: 'Simple things you can do to improve your gradle/android dependency management'
date:   2017-11-02 00:20:00
tags: ['android', 'gradle']
---

Google's approach in [this google samples repo](https://github.com/googlesamples/android-architecture-components/) seems to be tackling it very well. They actually do it across multiple projects but it applies for multiple modules as well. If you just have one module, don't bother doing this right now, but remember to do it when you decide to extract a module out.

Our main objectives are to

+ Minimise the effort required to update dependecies
+ Maintain consistency in dependency versions across modules

## What to do?

#### Step 1
Declare your dependencies and versions at the root of the project.

`$PROJECT_ROOT/dependencies.gradle`

```groovy
ext.versions = [:]

def versions = [:]

versions.support_lib = '26.0.2'
versions.gson = '2.8.0'

ext.versions = versions

ext.deps = [:]
def deps = [:]

def support_lib = [:]
support_lib.app_compat = "com.android.support:appcompat-v7:$versions.support_lib"
support_lib.recycler_view = "com.android.support:recyclerview-v7:$versions.support_lib"
deps.support_lib = support_lib

deps.gson = "com.google.code.gson:gson:$versions.gson"

ext.deps = deps
```

Attaching `versions` and `deps` to extra user properties `ext` will allow you to access those variables all across the project

#### Step 2
Import the definitions at the top of root project's `buildScript` block

`$PROJECT_ROOT/build.gradle`

```groovy
buildScript {
  apply from: 'dependencies.gradle'

  //left out for brevity...
}
```

#### Final step
Declare your module dependencies using the variables defined

`$PROJECT_ROOT/my-module/build.gradle`

```groovy
//left for brevity...
dependecies {
  implementation deps.support_lib.app_compat
  implementation deps.support_lib.recycler_view
  implementation deps.gson
}
```

## Approach
All we have done is **remove duplication** by reusing the version and dependency declarations done at one single place. Since all modules point to the same declaration, they all are in sync. And since there is only one declaration per dependency in the project, it is easy to find and update that one dependency.

## IntelliJ doesn't help you much here
#### Make your variable names easier to debug
Once you declare the variables, IntelliJ doesn't auto complete or suggest them else where when you are editing the gradle files. So make sure your variable name usages are proper and easily debuggable. That is intension behind using camel case here(YMMV).

#### Do not change all the dependencies at once
The error messages are not specific enough to figure out which variable name of dependency path you messed up. You can go ahead and define all the variables at once but add/use them one by one and sync your gradle file after each step to avoid frustrating debugging sessions.

## Feedback
What do you think of this approach? Is there a better way? I am actually curious how this changes when we use kotlin to write gradle files. [Let me know](https://twitter.com/okmanideep) your feedback.
