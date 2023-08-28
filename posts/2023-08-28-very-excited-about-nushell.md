---
cover: false
title: 'I am very excited about using nushell everyday'
description: 'From the moment I saw the intro video, I found it very appealing. It takes the best of bash and powershell'
date: 2023-08-28 13:00:00
tags: ['shell', 'windows', 'mac', 'bash', 'powershell']
---
From the moment I saw the [intro video](https://youtu.be/bMpYyqWCzZk?si=VLXcaCFLT2p_fHXf) I found it very appealing. It takes the best of `bash`(in unix) and `powershell`. I will assume you could totally relate to the `bash` part of that sentence.

## What's best in `powershell`?
I like the structural data flow in `powershell`. Since `powershell` commands aren't as well named for casual and quick scripting, it doesn't look good. But my OOP brain that could not master regex or `awk` in a decade was attracted to the named, associative data structures moving through the command pipeline.

I remember the first time I was trying to find the last modified file in a directory in a terminal running `bash`. I knew `ls` and I knew `sort`. I was totally in awe of the unix philosophy - individual programs doing only one thing and doing it well, composing different programs to solve complicated problems. So I tried
```bash
$ ls | sort
```
<img src="https://i.imgur.com/i0FEqKZ.jpg" alt="ls and sort in bash" style="max-width:480px;" />

🤔: *Oh! `ls` only outputs names. So I should use `ll` in this case*
```bash
$ ll | sort
```
<img src="https://i.imgur.com/ew8uvmA.jpg" alrt="ll and sort in bash" style="max-width: 600px;" />

🤔: *But how do I tell the `sort` command which property to use for sorting? Does it use size? Does it use the file name?*

I was obviously missing something. I found the answer with a quick Google. There is a `-t` flag on `ls`

So `ls` also does sorting. That's... not... simple... right?

You get the point. So let's see how it works in `powershell`
```sh
$ Get-ChildItem | Sort-Object -Property LastWriteTime -Descending
```
I told you it doesn't look good. Ok, you can make it slightly better with the built in aliases and lowercase letters, but the most good looking you can get is
```sh
$ ls | sort-object -property lastwritetime -descending
```
<img src="https://i.imgur.com/xvMFXrr.jpg" alt="last modified files in powershell" style="max-width: 600px" />

##### What is happening here?
Unlike plain strings in `bash`, in `powershell` we deal with structured data. `ls` outputs a table with columns - `Mode`, `LastWriteTime`, `Length` and `Name`. Which I can use further in the command pipeline to tell the `sort-object` command to sort the table using `lastwritetime` property

It doesn't look like the most convenient to type but I can understand how this works and use it in more places for solving more problems than the `-t` flag on `ls`.

## So... Nushell
This is how you do the same thing in `nu`
```sh
$ ls | sort-by -r modified
```

Just like `powershell`, `ls` outputs a table

<img src="https://i.imgur.com/tZEXjpl.jpg" alt="ls in nushell" style="max-width: 480px" />

But the names are much better. They bring the comfort and fun that was missing in using `powershell`. As I said, best of both worlds. [Nushell's homepage](https://www.nushell.sh/) has an even better example.

<img src="https://www.nushell.sh/frontpage/ls-example.png" alt="ls in nushell" style="max-width: 600px" />

## I am also excited about the speed
`powershell` was very slow to start. I guess it's mostly because of the plugins I am `import`ing in my profile but it takes 1500ms+ to initiliaze after a restart, and ~1000ms for every new tab I open in my terminal.

<img src="https://i.imgur.com/oo37EzL.jpg" alt="powershell startup message with 969ms initialization time" style="max-width: 480px" />

This is after I have spent some time profiling and optimizing. I removed a few plugins that were good to have but not must haves. 

I have been living with this for [well over an year](https://github.com/okmanideep/dotfiles/commit/baf2df87224fb86ce5af59b058955b4cfd5e1b50). Why you ask? Because I **hate** lock in. I remember watching all the sensible features Microsoft was bringing to Windows that were aimed directly at developers and wanting to give it a try. And then I realized I actually can't, with my current workflow. It's a long boring journey that we can talk later. But `powershell` was the only cross platform shell I could find to have a consistent workflow between my PC at home and my office Mac.

And `nu` startup in less than **100ms** after I have configured it to my liking with largely same behaviors.

<img src="https://i.imgur.com/40pcOjZ.jpg" alt="nushell startup message with 94ms startup time" style="max-width: 600px" />

Besides startup, the speed while usage isn't much different. It's barely noticeable and I won't be surprised if `powershell` beats `nu` in a few cases. But being ready to type as soon as I press the short cut for new tab, feels very nice.

I also have `vi` mode on the command line. I don't have to Google "move the cursor back word by word in command line" anymore.

## ⚠️
I am still a noob in `bash` and `powershell`. And I am a mega noob in `nushell`. It feels like a *pre-honeymoon* phase with `nu`. So there is a lot of adulation right now. It's likely that there are a lot of sour learnings to follow. Plain text is definitely simpler than tables. So maybe we are just moving complexity here. Or this is a very good abstraction and a lot of things improve. Time will tell.

If you are as intrigued by [`nushell`](https://www.nushell.sh/) as I am and want to give it a spin, I will warn you about one key thing - The language that is used for configuration and scripting - `nu` is not locked yet. They intend to evolve it and mercilessly break things until 1.0. You've been warned.
