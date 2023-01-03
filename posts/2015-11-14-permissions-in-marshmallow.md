---
cover: false
title: Permissions in marshmallow
description: 'A deep dive into requesting permissions in Android Marshmallow and handling extreme cases'
date:   2015-11-14 20:10:00
tags: [ 'android' ]
---

I expect you to first go and have a look at this page in the [Android Bible](http://developer.android.com/training/permissions/requesting.html) about permissions in marshmallow. Especially have a look at how to:

- Request the permissions you need
- Handle the permissions request response

#### Requesting for permission ####
You might have seen a code snippet like below in the training page.

```java
// Here, thisActivity is the current activity
if (ContextCompat.checkSelfPermission(thisActivity,
                Manifest.permission.READ_CONTACTS)
        != PackageManager.PERMISSION_GRANTED) {
    // Should we show an explanation?
    if (ActivityCompat.shouldShowRequestPermissionRationale(thisActivity,
            Manifest.permission.READ_CONTACTS)) {
        //show user the reason for permission
    } else {
        //request permission
    }
}
```

### Pay Attention ###
Lets just dive into the only tricky part here - `shouldShowRequestPermissionRationale()` returns

- **true** if 
    + The app has requested this permission previously and the user denied the request **in the dialog**
    + User has toggled off the permission **in the settings** (*Even if the app hasn't requested the permission yet, if the user just has toggled the switch on and off in the settings page, you are expected to show the rationale*)
- **false** if
    + The app didn't request for this permission yet
    + The user denied the permission and chose **Don't ask again** option
    + The device policy prohibits the app from having that permission (*Mostly in enterprise cenarios*)

### Consider this possible case ###
The above code works pretty much in most practical cases. Let us consider this case:

- The user has chosen **Don't ask again** for contacts access in the past (*which will most probably never happen if you have requested permissions gracefully and if the user made the decision conciously*) 
- And now the user wants to send a contact to his friend 

There is no way to detect using the above code that we were denied the permission, and ask him to grant the permission via application settings.

### The way out ###
Check for `shouldShowRequestPermissionRationale()` before and after asking permission. If it returns false both the times then the user chose 'Don't ask again' in the past or the device policy doesn't allow for that permission.

```diff-java
  boolean before, after;
  
  public void requestContactsPermission() {
      if (ContextCompat.checkSelfPermission(thisActivity,
                      Manifest.permission.READ_CONTACTS)
              != PackageManager.PERMISSION_GRANTED) {
          // Should we show an explanation?
+         before = ActivityCompat.shouldShowRequestPermissionRationale(thisActivity,
+                 Manifest.permission.READ_CONTACTS);
+         if (before) {
              //show user the reason for permission
          } else {
              //request permission
          }
      }
  }
  
  @Override
  public void onRequestPermissionsResult(int requestCode,
          String permissions[], int[] grantResults) {
      switch (requestCode) {
          case MY_PERMISSIONS_REQUEST_READ_CONTACTS: {
              if (grantResults.length > 0
                  && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
                  // permission was granted, yay! Do the
                  // contacts-related task you need to do.
              } else {
+                 after = ActivityCompat.shouldShowRequestPermissionRationale(
+                 thisActivity,
+                 Manifest.permission.READ_CONTACTS);
+                 boolean goToSettings = !(after || before);
+                 showRationale(goToSettings);
              }
              return;
          }
      }
  }
```

If both `before` and `after` are `false`, then show the user a dialog explaining that we need the contacts permission with a 'GO TO SETTINGS' button. On click take him to your application in the settings like this :

```java
private void goToSettings() {
    Intent intent = new Intent();
    intent.setAction(Settings.ACTION_APPLICATION_DETAILS_SETTINGS);
    Uri uri = Uri.parse("package:" + getPackageName());
    intent.setData(uri);
    startActivity(intent);
}
```
