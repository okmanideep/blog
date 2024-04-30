---
cover: false
title: 'Nushell, after 8 months'
description: "I have been using nushell as my primary shell for the last 8 months and I don't see myself going back to bash or zsh or powershell"
date: 2024-04-29 11:15:00
tags: ['shell', 'nushell', 'cli', 'unix', 'powershell']
---

> ... Plain text is definitely simpler than tables. So maybe we are just moving complexity here. Or this is a very good abstraction and a lot of things improve. Time will tell.

[Me, 8 months ago](https://okmanideep.me/i-am-very-excited-about-using-nushell-everyday/)

And the last 8 months have told me - Tables are a very good abstraction for CLI. No doubt. Possibly because they retain the fundamental nature of [Values](https://youtu.be/-6BsiVyC1kM?si=w1U3f4OzdOAT6C55). In fact, tables are already present in unix shell, hiding in plain text. `ps`, `ll`, `kubectl` and many more programs have a tabular output. And to do anything with them, it's a lot more easier in `nushell` than in `bash` or similar shells.

## Surprisingly seamless 🧈
I had my concerns initially - "Won't I face a lot of issues with all the unix programs, that just expect plain text and output plain text?". But it's barely been a problem. `nushell`'s inbuilt commands and operators just take care of converting plain text to structured data and extract the necessary values to pipe them back into other programs.

Let's take an example. Get the first pod's name with the status `Running` in a kubernetes cluster and enter it's shell?

```sh
$ kubectl -n namespace get pods
```
gets you a table like this

```
NAME                                                 READY   STATUS      RESTARTS      AGE
namespace-86c7df9555-4n9cc                             1/1     Running     0             2d2h
namespace-86c7df9555-65nks                             1/1     Running     0             2d2h
namespace-86c7df9555-cdzll                             1/1     Running     1 (35h ago)   2d1h
namespace-86c7df9555-dlpnx                             1/1     Running     0             35h
namespace-86c7df9555-fnrgd                             1/1     Running     0             2d2h
namespace-86c7df9555-lnx2v                             1/1     Running     0             2d1h
namespace-86c7df9555-nmwrx                             1/1     Running     0             2d2h
namespace-86c7df9555-xv45m                             1/1     Running     0             35h
```
This is just plain text but pipe it into `detect columns` and we get an actual `nushell` table

```sh
$ kubectl -n namespace get pods | detect columns
```

<img src="https://imgur.com/k5im8XR.png" style="max-width: 680px;" />

Now we can filter the rows with `where` and get the first row with `first`

```sh
$ kubectl -n namespace get pods | detect columns | where { $it.STATUS == "Running" } | first | get NAME
```

We can store this in a variable and access the shell with `kubectl exec`

```sh
$ let pod_id = kubectl -n namespace get pods | detect columns | where { $it.STATUS == "Running" } | first | get NAME
$ kubectl -n namespace exec -it $pod_id -- /bin/bash
```

Or just put it in `()` brackets and use it directly

```sh
$ kubectl -n namespace exec -it (kubectl -n namespace get pods | detect columns | where { $it.STATUS == "Running" } | first | get NAME) -- /bin/bash
```

Working within `nushell` has been a lot like working with the programming languages that I am used to. It feels like I am in a REPL of one of those languages. Familiar and comfortable.

## Perfect for data wrangling ⚙️
Lately I have been working with some csv files and what a delight it has been to work with them in `nushell`.

Colleague pings me saying "Here are the leads we want to add to the database - leads.csv".

I take a look at the file and there are some invalid user_ids in the file.

```sh
open leads.csv | where { ($it.user_id | describe) != 'int' } | count
```
I inform him - "Hey, we have 32 invalid user_ids in the leads.csv file. I will ignore them for now." and move on.

```sh
open leads.csv | where { ($it.user_id | describe) == 'int' } | get user_id | str join ',' | pbcopy
```
(Copies the user_ids to the clipboard)

I can probably do the same with `awk` and `sed` in `bash`. But this is a lot more simpler for me. Possibly because I work with object oriented languages a lot. And commands like `where`, `first`, `take`, `skip` are very familiar to me because all the languages have adopted these functional paradigms for operating with collections / streams.

By the way, if I want to convert that CSV to JSON?

```sh
open leads.csv | to json | pbcopy
```
Ready to just paste it into a node REPL.

This works with CSV, JSON, YAML, TOML, SQLite and [many more formats](http://www.nushell.sh/book/loading_data.html#opening-files). This came in handy to check which exact version of package is being used in a `package-lock.json` file a number of times.

```sh
open package-lock.json | get dependencies | get ws | get version
```

## It can't all be that good, can it?
While I was about to adopt a new shell that's not 1.0 yet, I was expecting to deal with some rough edges.

> It feels like a pre-honeymoon phase with nu. So there is a lot of adulation right now. It's likely that there are a lot of sour learnings to follow

[Me, 8 months ago](https://okmanideep.me/i-am-very-excited-about-using-nushell-everyday/)

To be honest, I didn't have to deal with many issues. But there was one which took a bit of time to figure out.

[fnm](https://github.com/Schniz/fnm) - fast node version manager, only offer setup instructions for `bash`, `zsh`, `fish` and `powershell` to add necessary changes to the shell profile for the right $PATH. For `nushell`, we have to use something like this

```sh
# fnm - node version manager
# https://dev.to/vaibhavdn/using-fnm-with-nushell-3kh1
load-env (/opt/homebrew/bin/fnm env --shell bash | lines | str replace 'export ' '' | str replace -a '"' '' | split column = | rename name value | where name != "FNM_ARCH" and name != "PATH" | reduce -f {} {|it, acc| $acc | upsert $it.name $it.value })

$env.PATH = ($env.PATH | prepend $"($env.FNM_MULTISHELL_PATH)/bin")
```

Essentially fake the shell, get the necessary changes and apply them to the `nushell` environment.

Some extra work to setup programs that output configuration for bash / zsh etc. And a few copy pasta for setting up some completions.

That's about it. After I have setup `nushell` in my system and added it to my [dotfiles](https://github.com/okmanideep/dotfiles), it's been a smooth ride across both Windows and MacOS. I have been using `nushell` as my primary shell for the last 8 months and I don't see myself going back to `bash` or `zsh` or `powershell`.
