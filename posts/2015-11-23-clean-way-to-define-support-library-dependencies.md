---
cover: false
title: Clean way to define support library dependencies
description: 'A cleaner way to define support library dependencies which makes updating their version number a whole lot easier'
date:   2015-11-23 20:10:00
tags: ['android']
---

As the support library started getting bigger with more tools in it, the team at google have suggested developers to pick and choose the individual pieces of the library in their dependencies. More recently our `build.gradle` files started to look like this

```groovy
dependencies {
    compile 'com.android.support:appcompat-v7:23.1.0'
    compile 'com.android.support:design:23.1.0'
    compile 'com.android.support:pallete-v7:23.1.0'
    compile 'com.android.support:cardview-v7:23.1.0'
    compile 'com.android.support:recyclerview-v7:23.1.0'
}
```

So when a new release comes out, we have to change the version number in every single line. Chris Banes, from the Android developer relations team, in [Android Dev Summit 2015](https://www.youtube.com/watch?v=ihQ16K8gSuQ&t=17m58s) has given this great tip to solve this problem.

<blockquote class="twitter-tweet" lang="en"><p lang="en" dir="ltr">This! <a href="https://twitter.com/hashtag/AndroidDev?src=hash">#AndroidDev</a> <a href="https://twitter.com/hashtag/AndroidDevSummit?src=hash">#AndroidDevSummit</a>&#10;🙏 <a href="https://twitter.com/chrisbanes">@chrisbanes</a> <a href="https://t.co/v47Pm74ohj">pic.twitter.com/v47Pm74ohj</a></p>&mdash; Manideep Polireddi (@okmanideep) <a href="https://twitter.com/okmanideep/status/669195097947377664">November 24, 2015</a></blockquote>
<script async src="//platform.twitter.com/widgets.js" charset="utf-8"></script>

Great! But there is a small **catch** here  

`compile 'com.android.support:appcompat-v7:${supportLibVersion}'` **doesn't work**  
`compile "com.android.support:appcompat-v7:${supportLibVersion}"` **WORKS!!!**  

If you haven't noticed yet, you should use **double quotes**

So the final code looks like this

```groovy
ext {
    supportLibVersion = '23.1.1'
}

dependencies {
    compile "com.android.support:appcompat-v7:${supportLibVersion}"
    compile "com.android.support:design:${supportLibVersion}"
    compile "com.android.support:pallete-v7:${supportLibVersion}"
    compile "com.android.support:cardview-v7:${supportLibVersion}"
    compile "com.android.support:recyclerview-v7:${supportLibVersion}"
}
```

By the way, Android Studio is intelligent enough that it will suggest you to update the version when there is a new one out, even in the above format. All hail IntelliJ.
