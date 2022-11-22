---
cover: false
title: 'RxConfusions - Part 1 : Map and FlatMap'
description: 'You probably know what the map operator is. This post discussed mostly about FlatMap and that probably will remove the confusion between map and flatMap operators if any'
date:   2015-12-01 20:10:00
tags:
  - rxjava
  - android
class: 'post-template'
subclass: 'post tag-rxjava tag-android'
categories: 'okmanideep'
navigation: True
disqus: 20151201201000
logo: 'logo-white.png'
---

If you don't know what RxJava is or you aren't comfortable with the terms `Observable`, `Observer`, `Operator` and `Subscriber`, I suggest you have a look at [Grokking RxJava](http://blog.danlew.net/2014/09/15/grokking-rxjava-part-1/) series by [Dan Lew](https://twitter.com/danlew42). 

If you have surfed through some RxJava content on the web, you should have come accross the `map()` operator. It is exactly what you think it is. But you might have seen people using the `flatMap()` operator in similar senarios which might have confused you a bit. Let's use them both in a small example and observe the effects of these operators.

Let's use this simple `Observer` for logging

```java
public void onCompleted() {
    System.out.println("onCompleted");
}

public void onError(Throwable e) {
    System.out.printf("onError: %s\n", e);
}

public void onNext(String s) {
    System.out.printf("onNext: %s\n", s);
}
```

#### Simple use of map operator ####

```java
public static void main(String[] args) {
    Printer printer = new Printer();
    String[] names = new String[] {"John", "Samuel", "Micheal", "Tom"};
    printer.printTitlesUsingMap(names);
}

private void printTitlesUsingMap(String[] names) {
    Observable.from(names)
            .map(Printer::getTitle)
            .subscribe(this);
}

private static String getTitle(String name) {
    return String.format("%s - %d", name, name.length());
}
```

Output :

```
onNext: John - 4
onNext: Micheal - 7
onNext: Tom - 3
onNext: Samuel - 6
onCompleted
```

Lets make it a little interesting

```diff-java
  private static String getTitle(String name) throws IllegalArgumentException{
+     if("Micheal".equals(name)) {
+         throw new IllegalArgumentException("Too many Micheals");
+     }
      return String.format("%s - %d", name, name.length());
  }
```

Output :

```
onNext: John - 4
onNext: Samuel - 6
onError: java.lang.IllegalArgumentException: Too many Micheals
```

Even though there are too many Micheals, you don't want to stop printing once a Micheal arrives. You might be thinking lets use `filter()` to filter out `Micheal` but let us assume the printer doesn't know when `getTitle()` fails. Operators like `map()` can't change the flow items, they just modify the items which are emitted. This is when operators like `flatMap()` come in handly

#### Enter the FlatMap ####

```diff-java
  private void printTitlesUsingFlatMap(String[] names) {
      Observable.from(names)
              .flatMap(Printer::getTitleObservable)
              .subscribe(this);
  }
  
  private static Observable<String> getTitleObservable(String name) {
      return Observable.create(subscriber -> {
          if(!subscriber.isUnsubscribed()) {
+             try {
+                 subscriber.onNext(getTitle(name));
+             } catch (IllegalArgumentException e) {
+                 //do nothing
+             }
+             subscriber.onCompleted();
          }
      });
  }
```

Notice that we are calling `subscriber.onComplete()` for every name. Guess the output... guessed it? Now have a look  
Output :

```
onNext: John - 4
onNext: Samuel - 6
onNext: Tom - 3
onCompleted
```

Is that what you expected? Probably not. Now have a look at what happens if don't call `subscriber.onComplete()` when there is an exception.

```diff-java
  return Observable.create(subscriber -> {
      if(!subscriber.isUnsubscribed()) {
          try {
              subscriber.onNext(getTitle(name));
+             subscriber.onCompleted();
          } catch (IllegalArgumentException e) {
              //do nothing
          }
      }
  });
```

Make a guess before you look at the output.

```
onNext: John - 4
onNext: Samuel - 6
onNext: Tom - 3
```

No `onComplete()` at all.  
Now make a guess who is the `subscriber` to our `getTitleObservable()` function.  
> The `flatMap()` operator is our subscriber  

If you are thiking - 'Wait, `flatMap()` is an *Operator* not a *Subscriber*', you should watch [Demistifying RxJava Subscribers](https://vimeo.com/144812843) by [Jake Wharton](https://twitter.com/JakeWharton). Basically, **everything** is a subscriber.

*FlatMap* collects all the observables returned for each item in the stream and emits all the items emitted by those observables. Simply put, it is a [merge of all observables returned by your mapping function](https://github.com/ReactiveX/RxJava/blob/1.x/src/main/java/rx/Observable.java#L5204). 
It calls `onComplete()` only when all the observables are *completed*.  

In this example `getTitleObservale("Micheal")` wasn't completed. So **FlatMap is waiting** for it to complete(Yes, it is in the memory).

Visualise what happened in the above example. Now think about the `map()` operator. If you feel like - 'They are two very different operators', then I have done my job. If you don't, [try confusing me as well](https://twitter.com/okmanideep).

I am no expert in this topic. Just sharing as I learn. Please [drop me a tweet](https://twitter.com/okmanideep) or a comment if I got anything wrong. And share it to people who you think will find this useful.

### EDIT ###

[Artem Zinnatullin](http://artemzin.com/blog/rxjava-defer-execution-of-function-via-fromcallable/)'s post suggests a better way to for our getTitleObservable().

```java
return Observable.fromCallable(() -> getTitle(name));
```

By using this method, you don't need to worry about calling the right functions to the subscriber. Thanks to [pakoito](https://www.reddit.com/r/androiddev/comments/3u5w0c/if_you_are_writing_observablecreate_theres_a_big/) for pointing that out.
