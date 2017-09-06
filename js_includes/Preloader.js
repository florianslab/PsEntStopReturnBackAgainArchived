//###########################
//
// PRELOADER CONTROLLER
//
// last edit: 06-22-2016 by Jeremy
//
// List of changes:
//   - Now considers out-of-sequence items to establish the groups,
//     checks if predicated only upon adding to items to load.
//
//   - Fixed the cycling-through selection of the items in latin-square groups.
//
//   - Now preloads only the items in the sequence.
//
//   - Now handles (non-dependent) latin-square designs:
//     loads only the items corresponding to the counter.
//     ##!! OBSOLETE !!##
//     # IMPORTANT: comment out any item with the same group
//     #            ID that does not enter in the sequence.
//     ##!! OBSOLETE !!##
//
// Lets you to preload images and audio files at the beginning
// of the experiment and also when the controller is reached in
// the thread of execution.
//
//##############


// listOfFiles has the pic/audio filenames as keys and "toLoad", "pending" or "loaded" as possible values
// loader has the same keys but has the IMG/AUDIO tags as values (where the file gets loaded)
var listOfFiles = {}, loaders = {};
  
// Loads the files listed in each Preloader controller
function loadFile() {
  // As this function is ran from an interval, we want to feed 'listOfFiles' only the first time
  if (Object.keys(listOfFiles).length == 0) {
      
      // Converts 'shuffleSequence' into the predicate functions (using Ibex-native toPredicate function, shuffle.js)
      function getListOfLabelPredicates(ss) {
        var predicates = [];
        // Going through each predicate (stored in the 'args' property of the shuffleSequence)
        for (i in ss.args) {
            // Some predicates are complex: e.g. 'rshuffle(...)' returns an array (cf. its definition in shuffle.js)
            if (typeof(ss.args[i]) == "object") // Using recursivity for complex predicates (cf. 'runShuffleSequence' in shuffle.js)
                predicates = predicates.concat(getListOfLabelPredicates(ss.args[i]));
            // When the predicate is simple, it is a simple string or a function and 'toPredicate' processes it for us (shuffle.js)
            else
                predicates.push(toPredicate(ss.args[i]));
        }
        return predicates;
      }

      var listOfLabelPredicates = getListOfLabelPredicates(shuffleSequence);

      // Returning whether the item is predicated
      function isItemPredicated(item) {
        // 'concerned' indicates whether the item matches one of the predicates
        var concerned = false, label = item[0];
        // When latin-square design, the label is embedded in an array
        if (typeof(label) == "object") label = label[0];
        // Going through the list of predicates to see if the label matches one of them
        for (pred in listOfLabelPredicates) {
            // If the label matches the predicate, return true
            if (listOfLabelPredicates[pred](label)) return true;
        }
        // Didn't match any predicate: return false
        return false;
      }
      
      var hostURL, group = null, groupsLengths = {}, groupsRanks = {};
      // First, draw the list of latin-square groups and their lengths
      for (item in items) {
          // Checking whether the item is part of a latin-square group
          if (Array.isArray(items[item][0])) {
            // The group ID
            group = items[item][0][1];
            // If latin square item
            if (group != undefined) {
              // Latin square dependencies not handled
              if (Array.isArray(group)) {
                 clearInterval(firstLoad);
                 throw "The Preloader controller does not handle latin-square dependencies (item "+item+").";
                 return;
              }
              // If no other items from the same latin-square group encountered yet, adding an entry for it
              if ($.inArray(""+group, Object.keys(groupsLengths)) < 0) groupsLengths[""+group] = 1;
              // Otherwise, increment it
              else groupsLengths[""+group]++;
            }
          }
      }
      // We will cycle through the latin square groups of items: it will be -1+1=0 when the first group is encountered
      var latinSquareGroupIndex = -1;
      // Second, draw the list of files' urls
      for (item in items) {
          // Checking for latin-square groups
          group = undefined;
          if (Array.isArray(items[item][0])) {
            group = items[item][0][1];
            // Getting the rank of the current item in its latin-square group
            if ($.inArray(""+group, Object.keys(groupsRanks)) < 0) {
                // It is a new group of items
                latinSquareGroupIndex++;
                groupsRanks[""+group] = 0;
            }
            else groupsRanks[""+group]++;
          }
          // Make sure to not process the item if part of latin-square group while not satisfying the counter (real optimization for large datasources!)
             // We replicate the behaviour of the latin-square cycling counter: we modulo-increment the ID of the item we pick up for each group
          if (group == undefined || groupsRanks[group] == (__counter_value_from_server__ + latinSquareGroupIndex) % groupsLengths[group]) {
            for (element in items[item]) {
              if (items[item][element] == "Preloader" && isItemPredicated(items[item])) {
                  // console.log("Loading from item "+item+" for group # "+groupsRanks[group]+" over a total of "+groupsLengths[group]+" groups."); // DEBUG
                  // console.log(predicatedItems[item]);         // DEBUG
                  // Retrieving the host for the pictures
                  hostURL = items[item][parseInt(element)+1].host;
                  // console.log(hostURL);         // DEBUG
                  if (hostURL == undefined) {
                    for (key in defaults) {
                        if (defaults[key] == "Preloader") hostURL = defaults[Math.round(key)+1].host;
                    }
                  }
                  if (hostURL == undefined) hostURL = "";
                  for (file in items[item][parseInt(element)+1].files) listOfFiles[hostURL+items[item][parseInt(element)+1].files[file]] = "toLoad";
              }
            }
          }
      }
    // console.log(groupsRanks); // DEBUG
  }
  // Checking if any file is left to load
  var file, found = false;
  for (file in listOfFiles) {
    if (listOfFiles[file] == "toLoad") {
      // We found at least one file to load
      found = true;
      break;
    }
  }
  // If we found no file to load
  if (!found) {
    // Just clear the interval and stop loading (hopefully the file will eventually get loaded)
    clearInterval(firstLoad);
    return;
  }
  // Checking the extension of the file
  var ext = file.split(".").pop();
  // Loading an image (PNG)
  if (ext.toLowerCase() == "png") {
        listOfFiles[file] = "pending";
        loaders[file] = new Image();
        (function (a) { loaders[file].onload = function() { isAppLoaded(a); }; }(file));
        loaders[file].src = file;
  }
  // Loading an audio (WAV or MP3 or OGG)
  else if (ext.toLowerCase().match(/^(wav|mp3|ogg)$/i)) {
        listOfFiles[file] = "pending";
        loaders[file] = new Audio();
        (function (a) { loaders[file].addEventListener('canplaythrough', function() { isAppLoaded(a); }, false); }(file));
        loaders[file].src = file;
  }
}

// When a file has been loaded
function isAppLoaded(file)
{
  listOfFiles[file] = "loaded";
}

// Launch loading
firstLoad = setInterval(loadFile, 100);
      
      
/* This software is licensed under a BSD license; see the LICENSE file for details. */
    
define_ibex_controller({
  name: "Preloader",

  jqueryWidget: {    
    _init: function () {
        this.cssPrefix = this.options._cssPrefix;
        this.utils = this.options._utils;
        this.finishedCallback = this.options._finishedCallback;
        
        this.html = dget(this.options, "html", "Please wait, resources are loading");
        // The list of files to load
        this.files = this.options.files;
        this.host = dget(this.options, "host", host);
        // The alternate host in case the original file doesn't get loaded
        this.alternateHost = dget(this.options, "alternateHost", null);
        // How long do we have to wait before giving up loading?
        this.timeout = dget(this.options, "timeout", 15000);
        // if (this.alternateHost) this.timeout = this.timeout / 2; // If we were to implement another loading with the alternate host
        // Whether failure to load should be reported in the results file
        this.report = dget(this.options, "report", true);

        this.element.addClass(this.cssPrefix + "preloader");
        this.element.append(htmlCodeToDOM(this.html));
        
        assert(Array.isArray(this.files), "Files must be an array of files");
        
        var t = this;
       
        // Clearing any prior timeout and interval
        clearTimeout(t.timer);
        clearInterval(t.checkLoaded);
        
        // Checking that all files have been loaded
        var allFilesLoaded = function() { 
            for (file in t.files) {
              assert(typeof t.files[file] == "string", "Each entry in the 'files' array must be a string");
              // If a file has not been loaded and is not yet listed as a failure, return FALSE
              if (listOfFiles[t.host+t.files[file]] != "loaded" && listOfFiles[t.host+t.files[file]] != "failed") return false;
            }
            // All files have been loaded: TRUE
            return true;
        };
        
        // Launching the interval to check for all files being loaded
        t.checkLoaded = setInterval(function() {
            if (allFilesLoaded()) {
                // If all files have been loaded, stop the interval
                clearInterval(t.checkLoaded);
                // If there was a timeout, also clear it
                if (typeof t.timeout == "number") clearTimeout(t.timer);
                // Pass to the next element in the thread
                t.finishedCallback(null);
            }}, 10);
        
        // If a timeout has been passed
        if (typeof t.timeout == "number")
          // Launch the timeout
          t.timer = setTimeout(function () {
                // We won't try to load anymore
                clearInterval(t.checkLoaded);
                var failedToLoad = [];
                // Going through the files to signal the unloaded ones
                for (file in t.files) {
                    if (listOfFiles[t.host+t.files[file]] != "loaded") {
                        // If an alternate host has been passed, try to use it instead
                        if (t.alternateHost) {
                          (function(host, alternateHost, file){
                          setInterval(function() { 
                            // Replacing all background images of DIVs with the alternate
                            $("div, img").each(function() {
                                if ($(this).css("background-image").match(host+file))
                                    $(this).css("background-image", 'url("'+alternateHost+file+'")');
                                else if ($(this).attr("src") != undefined && $(this).attr("src").match(host+file))
                                    $(this).attr("src", alternateHost+file);
                            });
                          }, 10);
                          })(t.host, t.alternateHost, t.files[file]);
                        }
                        // Mark the file as failure
                        listOfFiles[t.host+t.files[file]] = "failed";
                        // Add it to the list of the files that have not been loaded for this trial
                        failedToLoad.push(t.files[file]);
                    }
                }
                // Just signal it in the console for information
                console.log("Timeout "+failedToLoad.join(","));
                // Go to the next element in the thread after reporting the problem
                if (this.report == true) t.finishedCallback([[["Timeout", "Files failed to load"],
                                                              ["List of files", failedToLoad.join(",")]]]);
                // Or without reporting
                else t.finishedCallback(null);
            }, t.timeout);
    }
  },

  properties: {
    obligatory: ["files"],
    countsForProgressBar: false,
    htmlDescription: function (opts) {
        return truncateHTML(htmlCodeToDOM(opts.html), 100);
    }
  }
});

