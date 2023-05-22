---
cover: false
title: 'Migrating to Dart 3 and null safety'
description: 'Dart 3 is here, but we cannot adopt it unless our entire codebase is null safe. Here are few strategies we have been using to slowly migrate our codebase'
date:   2023-05-12 17:00:00
tags: ['flutter', 'dart']
---

Dart 3 🎯 is here! And it brings very useful features like `sealed` classes, pattern matching and [many more](https://www.youtube.com/watch?v=yRlwOdCK7Ho&t=1766s).

It also **ends the support for `--no-sound-null-safety`**.

Which means to adopt it in any codebase, every single file should be null safe.

Like us at [Praja](https://github.com/praja), if you have started writing your Flutter app more than a couple of years ago, you would have started slowly migrating your codebase to sound null safety. Some of you would have completed it. If you are one of them [I would like to here about your experience](https://twitter.com/okmanideep) and learn what helped and what didn't.

If you are still going through this transition, I hope this helps you. Here's how we have approached it.

### Preread 📄
[Official Dart Guide for migrating to null safety](https://dart.dev/null-safety/migration-guide)

### 1. Mark all your existing files as not null safe 🏁
Skip this step if you have already done it.

* Upgrade dart to 2.12+
* Add `// @dart = 2.9` to the starting of every dart file in your project and manually convert your `main.dart`

The following script can help you out here
```ruby
#!/usr/bin/env ruby

directory = "/lib"

# Navigate to the directory
Dir.chdir(directory)

# Loop through each .dart file in the directory
Dir.glob("**/*.dart").each do |file|
  # Check if the file is a regular file
  if File.file?(file)
    # Prepend "// @dart=2.9" to the file
    content = File.read(file)
    File.open(file, "w") do |f|
      f.write("// @dart=2.9\n#{content}")
    end
    puts "Added // @dart=2.9 to #{file}"
  end
end
```

With this you can start using `flutter run --no-sound-null-safety` and run your app as always

### 2. Add a PR check as a nudge for your team ✅
Since this doesn't immediately impact the product, it's not going to be worth it to migrate all the files as a single task / project. We want to do this gradually over a few months. For that, we'd like some regular nudges to everyone in the team to slowly convert files they are touching.

A PR check like this can help out in a big way
```yaml
name: Dart Null Safety Validation
on: [pull_request]

env:
  GITHUB_BASE_REF: ${{github.base_ref}}
  
jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      - name: Validate Dart files
        shell: bash
        run: |
          # Fetch the base branch for diffing
          git fetch origin $GITHUB_BASE_REF:$GITHUB_BASE_REF

          n_files=$((grep -r -H --include \*.dart "// @dart = 2.9" $(git diff --name-only $GITHUB_BASE_REF --diff-filter=AMR) || true) | wc -l)

          if [ $n_files -ne 0 ]; then
            echo "Dart Files that changed, but still contain 2.9 dart version:"
            grep -r -H --include \*.dart "// @dart = 2.9" $(git diff --name-only $GITHUB_BASE_REF --diff-filter=AMR)
            echo "\n"
            echo "Please convert the above files to project dart version"
            exit 1
          fi

```
This validates that all `.dart` files added/modified in a PR are null safe.

Based on your team, you can choose to make this an optional or a required check. We chose to have it as optional and it worked out for us.

With just this, over a couple of months, we converted over half the codebase to null safety!

### 3. Highlight low hanging fruits 🍎
There are bound to be some files which are not touched at all and are lying there, which stop your from adopting full sound null safety. The PR check is not going to help here.

A small script that can tell you how many files are left to convert and what are few low hanging fruits helps quite a bit

<img src="/img/null-safe-report-usage.png"/>

```ruby
# frozen_string_literal: true

# Usage:
# From the root of this project
# $ ruby scripts/null_safe_report.rb ./lib
require 'find'

# This class is used to sort the files by line count
class FileToConvert
  def initialize(file_name, line_count)
    @file_name = file_name
    @line_count = line_count
  end

  attr_reader :line_count

  def to_s
    "#{@file_name}: #{@line_count} lines"
  end
end

path = ARGV[0]

file_count = 0
files_to_convert = []
Dir.glob("#{path}/**/*.dart") do |file_name|
  file_count += 1
  first_line = File.open(file_name, &:readline)
  is_non_null_safe = first_line.start_with?('// @dart = 2.9')
  files_to_convert << FileToConvert.new(file_name, File.foreach(file_name).count) if is_non_null_safe
end

files_to_convert.sort_by!(&:line_count)

puts "Null safe percent: #{((file_count - files_to_convert.count).to_f / file_count.to_f * 100).round(2)}%"
puts "Number of files left to convert: #{files_to_convert.count}"
puts ''
puts '10 Smallest files left to convert:'
files_to_convert[0..9].each do |file|
  puts file
end
```

### 4. The final push 🥅
You likely have a few huge files that no one wants to touch. Likely some God object definitions. There is no shortcut here. We have to approach it like some good old tech debt and buy some time to replace these.

We are yet to make this final push. Will update this article if we have any learnings.
