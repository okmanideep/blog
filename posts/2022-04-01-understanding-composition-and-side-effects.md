---
cover: false
title: 'Understanding Composition and Side Effects'
description: 'Important aspect to any framework that relies on functions is to understand when they are invoked. Read along to get a crystal clear understanding'
date:   2022-04-01 18:00:00
tags: ['jetpack', 'compose', 'android']
---

<style>
.insight {
    background: #3B4354;
    border-radius: 3px;
    padding: 12px;
}
.insight > :first-child {
    margin-top: 0;
}
.insight > :last-child {
    margin-bottom: 0;
}
</style>

Jetpack Compose is a **Declarative UI Framework** that allows us to define UI, state and side effects by declaring functions. A lot of them. Named and anonymous (lambdas). We will try and understand when does the framework invoke the functions we are declaring.

Some of those functions we *declare* are [Side Effects](https://developer.android.com/jetpack/compose/side-effects). Specifically we are going to look at `LaunchedEffect`, `SideEffect` and `DisposableEffect`

They look like this in the code

```kotlin
LaunchedEffect(/*key(s)*/) {
    /* effect that we are declaring as a lambda */
}
```

When the above code is run, `LaunchedEffect` [the function](https://developer.android.com/reference/kotlin/androidx/compose/runtime/package-summary#LaunchedEffect(kotlin.Any,kotlin.coroutines.SuspendFunction1)) runs and registers the lambda we passed, to run it when it needs to be run. Well when exactly? We should get an idea very soon. 

Let's dive in. 

## 🛠 Setup
A `@Composable` which sets up a bunch of logs inside Side Effects - `DisposableEffect`, `SideEffect` and `LaunchedEffect`

```kotlin
@Composable
fun Effects(
    logTag: String,
    key: Any = logTag,
) {
    val tag = logTag.padEnd(25)
    log("$tag - Registering Effects")
    LaunchedEffect(key) {
        log("$tag - LaunchedEffect")
    }
    DisposableEffect(key) {
        log("$tag - DisposableEffect")
        onDispose {
            log("$tag - onDispose")
        }
    }
    SideEffect {
        log("$tag - SideEffect")
    }
}
```

And a `TrafficLight` that shows an emoji in `Text`. Also uses the `Effects` we defined above for logging

```kotlin
@Composable
fun TrafficLight(
    lightEmoji: String,
    modifier: Modifier = Modifier
) {
    Text(lightEmoji, fontSize = 120.sp, modifier = modifier)

    Effects("TrafficLight($lightEmoji)")
}
```

## Touch And Go
We are going to start by adding and removing this `TrafficLight` on touch as shown below

```kotlin
@Composable
fun TouchAndGo() {
    var isVisible by remember { mutableStateOf(false) }
    Box(
        contentAlignment = Alignment.Center,
        modifier = Modifier
            .fillMaxSize()
            .clickable {
                log("---Click---------------------")
                isVisible = !isVisible
            },
    ) {
        if (isVisible) {
            TrafficLight(lightEmoji = "🟢")
        }
    }
}
```
Initially we show nothing. On click, we show the green light 🟢.

<video width="320" height="320" autoplay muted loop>
  <source src="https://i.imgur.com/TCy72F9.mp4" type="video/mp4">
</video>

Together, this is what we have got

```kotlin
@Composable
fun TouchAndGo() {
    var isVisible by remember { mutableStateOf(false) }
    Box(
        contentAlignment = Alignment.Center,
        modifier = Modifier
            .fillMaxSize()
            .clickable {
                log("---Click---------------------")
                isVisible = !isVisible
            },
    ) {
        if (isVisible) {
            TrafficLight(lightEmoji = "🟢")
        }
    }
}

@Composable
fun TrafficLight(
    lightEmoji: String,
    modifier: Modifier = Modifier
) {
    Text(lightEmoji, fontSize = 120.sp, modifier = modifier)

    Effects("TrafficLight($lightEmoji)")
}

@Composable
fun Effects(
    logTag: String,
    key: Any = logTag,
) {
    val tag = logTag.padEnd(25)
    log("$tag - Registering Effects")
    LaunchedEffect(key) {
        log("$tag - LaunchedEffect")
    }
    DisposableEffect(key) {
        log("$tag - DisposableEffect")
        onDispose {
            log("$tag - onDispose")
        }
    }
    SideEffect {
        log("$tag - SideEffect")
    }
}
```

Let's have a look at the logs

```
---Click---------------------
TrafficLight(🟢)     - Registering Effects
TrafficLight(🟢)     - DisposableEffect
TrafficLight(🟢)     - SideEffect
TrafficLight(🟢)     - LaunchedEffect
---Click---------------------
TrafficLight(🟢)     - onDispose
```

<div class="insight">
<h3>✨ Insights</h3>

<p>When a <code>Composable</code> enters composition:</p>

<ul>
<li>Our <code>@Composable</code> function runs first</li>
<li>Then the <code>DisposableEffect</code>, the <code>SideEffect</code> and the <code>LaunchedEffect</code> in that order</li>
</ul>

<p>When a <code>Composable</code> exits composition:</p>

<ul>
<li>The <code>onDispose</code> of the corresponding <code>DisposableEffect</code> runs</li>
</ul>
</div>

Let's make it slightly more interesting. Let's add `Effects` above and below the `TrafficLight`

```diff-kotlin
 @Composable
 fun TouchAndGo() {
     var isVisible by remember { mutableStateOf(false) }
     Box(
         /*...*/
     ) {
         if (isVisible) {
+            Effects("Pre - TrafficLight(🟢)")
             TrafficLight(lightEmoji = "🟢")
+            Effects("Post - TrafficLight(🟢)")
         }
     }
 }
```

So what do we have on the logs now?

```
---Click---------------------
Pre - TrafficLight(🟢)    - Registering Effects
TrafficLight(🟢)          - Registering Effects
Post - TrafficLight(🟢)   - Registering Effects
Pre - TrafficLight(🟢)    - DisposableEffect
TrafficLight(🟢)          - DisposableEffect
Post - TrafficLight(🟢)   - DisposableEffect
Pre - TrafficLight(🟢)    - SideEffect
TrafficLight(🟢)          - SideEffect
Post - TrafficLight(🟢)   - SideEffect
Pre - TrafficLight(🟢)    - LaunchedEffect
TrafficLight(🟢)          - LaunchedEffect
Post - TrafficLight(🟢)   - LaunchedEffect
---Click---------------------
Post - TrafficLight(🟢)   - onDispose
TrafficLight(🟢)          - onDispose
Pre - TrafficLight(🟢)    - onDispose
```

<div class="insight">
<h3>✨ Insights</h3>

<p>On Entering Composition: </p>
<ul>
    <li>All the Side Effects run in the order they are declared / registered</li>
    <li>Among the different Side Effects - <code>DisposableEffect</code>s run first, followed by <code>SideEffect</code>s, followed by <code>LaunchedEffect</code></li>
</ul>

<p>On Exiting Composition: </p>
<ul>
    <li><code>DisposableEffect</code>s are <i>disposed</i> in the <b>reverse</b> order they are declared / registered. <b>L</b>ast <b>I</b>n <b>F</b>irst <b>O</b>ut - LIFO. Like a stack!</li>
</ul>

</div>

---

## Stop And Go
Toggle between 🟢 and 🔴 on click

```kotlin
@Composable
fun StopAndGo() {
    var go by remember { mutableStateOf(true) }

    Box(
        contentAlignment = Alignment.Center,
        modifier = Modifier
            .fillMaxSize()
            .clickable {
                log("---Click---------------------")
                go = !go
            },
    ) {
        val light = if (go) "🟢" else "🔴"
        TrafficLight(lightEmoji = light)
    }
}
```


<video width="320" height="320" autoplay muted loop>
  <source src="https://i.imgur.com/pJWzmgh.mp4" type="video/mp4">
</video>

```
TrafficLight(🟢)     - Registering Effects
TrafficLight(🟢)     - DisposableEffect
TrafficLight(🟢)     - SideEffect
TrafficLight(🟢)     - LaunchedEffect
---Click---------------------
TrafficLight(🔴)     - Registering Effects
TrafficLight(🟢)     - onDispose
TrafficLight(🔴)     - DisposableEffect
TrafficLight(🔴)     - SideEffect
TrafficLight(🔴)     - LaunchedEffect
```

<div class="insight">
<h3>✨ Insights</h3>
<ul>
<li>Incoming <code>DisposableEffect</code>s are <b>registered before</b> the outgoing <code>DisposableEffect</code>s are <b>disposed</b></li>
<li>Incoming <code>DisposableEffect</code>s are <b>run after</b> the outgoing <code>DisposableEffect</code>s are <b>disposed</b></li>
</ul>

</div>

One might have expected this, because compose runtime figures out what are *incoming* and what are *outgoing* only after it runs / re-runs our `Composable` functions based on the new `State`.

Nevertheless, this is an important aspect to keep in mind. Since this makes it safe for two `Composable`s that are never in composition together, to `acquire`/`release` to the same resource in their `DisposableEffect`s.

## Stop Fade Go
More often than not, we animate our changes. Let's look at the order of execution when we add animation to the above example

```diff-kotlin
 @Composable
 fun StopFadeGo() {
     var go by remember { mutableStateOf(true) }
 
     Box(
         contentAlignment = Alignment.Center,
         modifier = Modifier
             .fillMaxSize()
             .clickable {
                 log("---Click---------------------")
                 go = !go
             },
     ) {
         val light = if (go) "🟢" else "🔴"
+        Crossfade(targetState = light) {
+            TrafficLight(lightEmoji = it)
+        }
     }
 }
```

```
TrafficLight(🟢)     - Registering Effects
TrafficLight(🟢)     - DisposableEffect
TrafficLight(🟢)     - SideEffect
TrafficLight(🟢)     - LaunchedEffect
---Click---------------------
TrafficLight(🔴)     - Registering Effects
TrafficLight(🔴)     - DisposableEffect
TrafficLight(🔴)     - SideEffect
TrafficLight(🔴)     - LaunchedEffect
TrafficLight(🟢)     - onDispose
```

<div class="insight">
<h3>✨ Insights</h3>

<p>When animated, the outgoing <code>DisposableEffect</code>s are disposed only after the animation is complete</p>
</div>

Might feel obvious in hindsight. But it is important to keep in mind that since the *incoming* `DisposableEffect` runs before the *outgoing* disposes. This basically doesn't allow those `Composable`s to acquire/attach-to the same resource.

---
## Ready Set Go
🔴 Ready -> 🔴 Set -> 🟢 Go on click

```kotlin
@Composable
fun ReadySetGo() {
    var count by remember { mutableStateOf(1) }

    Box(
        contentAlignment = Alignment.Center,
        modifier = Modifier
            .fillMaxSize()
            .clickable {
                log("---Click---------------------")
                count++
            },
    ) {
        val step = count % 3
        val light = if (step == 0) "🟢" else "🔴"
        val message = when (step) {
            1 -> "Ready"
            2 -> "Set"
            0 -> "GO!"
            else -> "Uh Oh!"
        }
        Column(horizontalAlignment = Alignment.CenterHorizontally) {
            TrafficLight(lightEmoji = light)
            Spacer(modifier = Modifier.height(8.dp))
            Text(message, fontSize = 36.sp)
        }
    }
}
```

<video width="320" height="320" autoplay muted loop>
  <source src="https://i.imgur.com/dEqERF5.mp4" type="video/mp4">
</video>

```
TrafficLight(🔴)     - Registering Effects
TrafficLight(🔴)     - DisposableEffect
TrafficLight(🔴)     - SideEffect
TrafficLight(🔴)     - LaunchedEffect
---Click---------------------
---Click---------------------
TrafficLight(🟢)     - Registering Effects
TrafficLight(🔴)     - onDispose
TrafficLight(🟢)     - DisposableEffect
TrafficLight(🟢)     - SideEffect
TrafficLight(🟢)     - LaunchedEffect
```

> Note that for both "Ready" and "Set" states, the light is 🔴

<div class="insight">
<h3>✨ Insights</h3>

<p>Composition and Effects are skipped when the inputs don't change!</p>
</div>

Just like [the documentation says](https://developer.android.com/jetpack/compose/lifecycle#skipping). But what does "inputs not changing" really mean? Let's find out.

Instead of passing in a `String`, let's create our own `class`

```kotlin
private class Light(val emoji: String)
```
Update the `TrafficLight` and `ReadySetGo` to use `Light` instead of a `String`

```diff-kotlin
 @Composable
 fun ReadySetGoClass() {
     var count by remember { mutableStateOf(1) }
 
     Box(
         contentAlignment = Alignment.Center,
         modifier = Modifier
             .fillMaxSize()
             .clickable {
                 log("---Click---------------------")
                 count++
             },
     ) {
         val step = count % 3
+        val light = if (step == 0) Light("🟢") else Light("🔴")
         val message = when (step) {
             1 -> "Ready"
             2 -> "Set"
             0 -> "GO!"
             else -> "Uh Oh!"
         }
         Column(horizontalAlignment = Alignment.CenterHorizontally) {
+            TrafficLight(light)
             Spacer(modifier = Modifier.height(8.dp))
             Text(message, fontSize = 36.sp)
         }
     }
 }
 
 @Composable
 private fun TrafficLight(
+    light: Light,
     modifier: Modifier = Modifier
 ) {
+    val lightEmoji = light.emoji
     Text(lightEmoji, fontSize = 120.sp, modifier = modifier)
 
+    Effects("TrafficLight($lightEmoji)", key = light)
 }
```

Here are the logs after the change

```
TrafficLight(🔴)     - Registering Effects
TrafficLight(🔴)     - DisposableEffect
TrafficLight(🔴)     - SideEffect
TrafficLight(🔴)     - LaunchedEffect
---Click---------------------
TrafficLight(🔴)     - Registering Effects
TrafficLight(🔴)     - onDispose
TrafficLight(🔴)     - DisposableEffect
TrafficLight(🔴)     - SideEffect
TrafficLight(🔴)     - LaunchedEffect
---Click---------------------
TrafficLight(🟢)     - Registering Effects
TrafficLight(🔴)     - onDispose
TrafficLight(🟢)     - DisposableEffect
TrafficLight(🟢)     - SideEffect
TrafficLight(🟢)     - LaunchedEffect
```

Well what happened there!

Our `Light` doesn't implement `.equals()`. The default implementation returns true only if they are the same instances. But we are creating a new instance every time. So compose runtime sees these as different inputs.

Let's add a log to `equals()`

```diff-kotlin
 private class Light(val emoji: String) {
     override fun equals(other: Any?): Boolean {
         if (other is Light) {
+            val result = super.equals(other)
+            log("$emoji.equals(${other.emoji}) = $result")
             return result
         }
         return super.equals(other)
     }
 }
```
Haven't changed the implementation yet. Just added a log.

The same logs as above but with `equals()`

```
TrafficLight(🔴)     - Registering Effects
TrafficLight(🔴)     - DisposableEffect
TrafficLight(🔴)     - SideEffect
TrafficLight(🔴)     - LaunchedEffect
---Click---------------------
🔴.equals(🔴) = false
TrafficLight(🔴)     - Registering Effects
🔴.equals(🔴) = false
🔴.equals(🔴) = false
TrafficLight(🔴)     - onDispose
TrafficLight(🔴)     - DisposableEffect
TrafficLight(🔴)     - SideEffect
TrafficLight(🔴)     - LaunchedEffect
---Click---------------------
🔴.equals(🟢) = false
TrafficLight(🟢)     - Registering Effects
🔴.equals(🟢) = false
🔴.equals(🟢) = false
TrafficLight(🔴)     - onDispose
TrafficLight(🟢)     - DisposableEffect
TrafficLight(🟢)     - SideEffect
TrafficLight(🟢)     - LaunchedEffect
```

So compose runtime compared the inputs. It observed that they are different (`.equals()` returned `false`), so ran the composable with the new input. It then compared the inputs again, to see if it has to run the `DisposableEffect` and the `LaunchedEffect` and ran them again because it received `false`.

> After all `DisposableEffect` and `LaunchedEffect` are `Composable` functions themselves

Let's implement `equals()`

```diff-kotlin
 private class Light(val emoji: String) {
     override fun equals(other: Any?): Boolean {
         if (other is Light) {
+            val result = emoji == other.emoji
             log("$emoji.equals(${other.emoji}) = $result")
             return result
         }
         return super.equals(other)
     }
 }
```

```
TrafficLight(🔴)     - Registering Effects
TrafficLight(🔴)     - DisposableEffect
TrafficLight(🔴)     - SideEffect
TrafficLight(🔴)     - LaunchedEffect
---Click---------------------
🔴.equals(🔴) = true
---Click---------------------
🔴.equals(🟢) = false
TrafficLight(🟢)     - Registering Effects
🔴.equals(🟢) = false
🔴.equals(🟢) = false
TrafficLight(🔴)     - onDispose
TrafficLight(🟢)     - DisposableEffect
TrafficLight(🟢)     - SideEffect
TrafficLight(🟢)     - LaunchedEffect
```
Back to normal.

Let's summarize all the insights

<div class="insight">
<h3>✨ Insights</h3>
<p>➡️ On Entering Composition: </p>
<ul>
    <li>Our <code>Composable</code> function runs first</li>
    <li>All the Side Effects run in the order they are declared / registered</li>
    <li>Among the different Side Effects - <code>DisposableEffect</code>s run first, followed by <code>SideEffect</code>s, followed by <code>LaunchedEffect</code></li>
</ul>

<p>⬅️ On Exiting Composition: </p>
<ul>
    <li><code>DisposableEffect</code>s are <i>disposed</i> in the <b>reverse</b> order they are declared / registered. <b>L</b>ast <b>I</b>n <b>F</b>irst <b>O</b>ut - LIFO. Like a stack!</li>
</ul>

<p>🔀 When a composable is being replaced with another or recomposed with the new state:</p>
<ul>
<li>Incoming <code>DisposableEffect</code>s are <b>registered before</b> the outgoing <code>DisposableEffect</code>s are <b>disposed</b></li>
<li>Incoming <code>DisposableEffect</code>s are <b>run after</b> the outgoing <code>DisposableEffect</code>s are <b>disposed</b></li>
</ul>

<p>💫 When animated, the outgoing <code>DisposableEffect</code>s are disposed only after the animation is complete.</p>

<p>🚫 Composition and Effects are skipped when the inputs don't change. Inputs are compared using their <code>equals()</code> method</p>
</div>

