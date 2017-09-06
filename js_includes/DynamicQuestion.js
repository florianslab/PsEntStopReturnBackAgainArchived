//###########################
//
// PRELOADER CONTROLLER
//
// last edit: 04-06-2016 by Jeremy
//
// History of changes:
//  - 04-08-2016:
//      + Modified 'answers' so that it accepts non-string values (jQuery Objects)
//  - 04-06-2016:
//      + Removed {func: ...}, now simply expects a plain function
//      + Changed parameters' names:
//             question > legend
//             elements > sequence
//             clickablePictures > clickableAnswers
//             {this: "choice"} > {this: "answers"}
//      + Added 'showKeys' option to print the keys to press either
//             {this: "answers", showKeys: "top"}
//      + Added the 'jQueryObject' element
//      + Added an 'id' parameter to any element in the sequence
//             {jQueryObject: "Simple line of text", id: "simpleText01"}
//      + Added a function 'picture' to simply get a jQuery picture object
//      + Added a function 'remove' to hide a DOM element
//
//  - 03-17-2016: 'newRTs' were recorded as [answerTime -  creationTime, ..., answerTime - penultimateShowUp, answerTime - lastShowUp]
//                now recorded as [firstShowUp - creationTime, secondShowUp - firstShowUp, ..., answerTime - lastShowUp]
//
// Displays the content in a sequential, dynamic way.
// Provides experiment developers with pauses, execution of functions, etc.
// Initially developed for covered-box tasks:
// There are built-in options to validate with key pressing or clicking on answers.
// But the 'function' feature allows one to resort to t.finishedCallback() however one wants.
//
//##############

//###########################
//
// EXAMPLE OF USE
//
// ["itemLabel", "DynamicQuestion", {
//
//   legend: "This will be recorded in the result file.",
//   answers: {Validate: ["F", "Click on F to validate."], Reject: ["J", "Click on J to reject."]},
//   enabled: false,                             // The user won't validate the trial by clicking/pressing the key.
//
//   sequence: [
//
//     {this: "legend"},                         // Prints the 'question' parameter (not implemented yet)
//     {pause: "key ", newRT: true},             // Wait for the participant to press the space bar and records a new RT when they do
//     function(t){ t.enabled = true; },         // Enable validation
//     "Now make your decision",
//     {this: "answers", showKeys: "bottom"}
//
//   ]
//
// }]
//
//##############

function picture(img) {
    var path = "../chunk_includes/";
    if (typeof host != "undefined") path = host;
    var file = path+img;
    if (img.match(/^http:\/\//)) file = img;
    return $("<img>").attr("src", path+img);
}

function remove(id) {
    return function(t) { $("#"+id).css("display", "none"); };
}

(function () {
    
var __Question_callback__ = null;
var __Questions_answers__ = [];
var __Times__ = [];
var __Visible_picture__ = null;
var __Covered_picture__ = null;

define_ibex_controller({
name: "DynamicQuestion",

jqueryWidget: {
    _init: function () {
        
        __Times__ = [];
        __Questions_answers__ = [];
        
        // Checks that the browser can play audio files
        var a = document.createElement('audio');
        if (!(a.canPlayType && a.canPlayType('audio/mpeg;').replace(/no/, ''))) {
            var errorMessage = "We are sorry but your browser seems not to support our audio playing. " +
                            "You therefore cannot take part in this experiment. Thank you for your understanding."
            alert(errorMessage);
            throw new Error(errorMessage);
        }
        
        this.cssPrefix = this.options._cssPrefix;
        this.utils = this.options._utils;
        this.finishedCallback = this.options._finishedCallback;

        var questionField = "Legend";
        var answerField = "Chosen answer";
        var correctField = "Whether or not answer was correct (NULL if N/A)";
        var timeField = "Time taken to answer.";
        
        this.context = dget(this.options, "context");
        this.answers = this.options.answers;
        this.question = dget(this.options, "legend");
        this.sendResults = dget(this.options, "sendResults", true);
        this.elements = dget(this.options, "sequence");
        this.autoScroll = dget(this.options, "autoScroll", true);
        this.clickableAnswers = dget(this.options, "clickableAnswers", true);
        this.hasCorrect = dget(this.options, "hasCorrect", false);
        this.randomOrder = dget(this.options, "randomOrder", ! (this.hasCorrect === false));
        this.enabled = dget(this.options, "enabled", true);
        this.unpause = null;

        assert(typeof this.answers == "object", "'answers' must be an object");

        // hasCorrect is either false, indicating that there is no correct answer,
        // or a string giving the correct answer's index.
        // Now we change it to either false or an index.
        if (typeof(this.hasCorrect) == "string") assert(this.answers.hasOwnProperty(this.hasCorrect),
          "Value of 'hasCorrect' option not recognized");

        // The keys of 'answers' (could be the name of each answer, or a pair of the name + a key to press)
        this.answerNames = Object.keys(this.answers);
        // Determining whether and how the answers are associated with keys to press
        this.answerByPressingAKey = false;
        if (Array.isArray(this.answers[this.answerNames[0]])) this.answerByPressingAKey = "associated";
        else if (Array.isArray(this.randomOrder)) this.answerByPressingAKey = "random";
        
        // If the order of presentation of the answers is random
        if (this.randomOrder) {
            // We make sure that not both 'randomOrder' and the answers specify a list of keys (conflict)
            assert(! (Array.isArray(this.randomOrder) && this.answerByPressingAKey == "associated") ,
                  "Cannot set 'randomOrder' option to a list of keys when keys are included with the 'answers' option.");
            // We make sure that if 'random' provides a list of keys, there is one for each answer (same length)
            assert(! (this.answerByPressingAKey == "random" && this.answerNames.length != this.randomOrder.length),
                   "Length of 'randomOrder' doesn't match number of 'answers'.");
            // Copy the keys of 'answers' into 'orderedAnswers'
            this.orderedAnswers = new Array(this.answerNames.length);
            for (var i = 0; i < this.answerNames.length; ++i)
                this.orderedAnswers[i] = this.answerNames[i];
            // And Fisher-Yate 'orderedAnswers' to get the final order of presentation
            fisherYates(this.orderedAnswers);
        }
        else {
            // If not random, then present the answers in the given order
            this.orderedAnswers = this.answerNames;
        }

        this.setFlag = function(correct) {
            if (! correct) {
                this.utils.setValueForNextElement("failed", true);
            }
        }

        var t = this;

        var showNext = function (next, newRT) {
            
          if (next.length < 1 || Number(next[0]) == 0) {
            t.finishedCallback(__Questions_answers__);
            return false;
          }
          else {
            
            if (newRT) __Times__.push(new Date().getTime());
              
            //for (el in next) {
            for (var el = next.length-1; el >= 0; --el) {
                var child = t.element.children()[next[el]];
                $(child).css("display", "");
                if (child.nodeName == "AUDIO")
                    child.play();
                else if (child.nodeName == "PAUSE") {
                    var nRT = $(child).attr("newRT"), value = $(child).attr("value").match("^key(.*)");
                    // If the attribute value starts with "key"
                    if (value)
                      (function(keys,next, RT) {
                        t.unpause = function(key)
                        {
                          if (keys.length == 0 || keys.toUpperCase().match(String.fromCharCode(key))) {
                              t.unpause = null;
                              showNext(next.split(","), RT);
                          }
                        };
                      }(value[1],$(child).attr("next"), nRT));
                    // If the attribute value is a number
                    else
                      // Have to use this hack (IIFE) to make sure "elementsToShow" is interpreted right away
                      (function(a, RT) {
                        setTimeout(function()
                        {
                          showNext(a.attr("next").split(","), RT);
                        },
                        a.attr("value"));
                      }($(child), nRT));
                }
                //else if (t.elements[next[el]].hasOwnProperty("func"))
                //    t.elements[next[el]].func(t);
                else if (typeof t.elements[next[el]] == "function")
                    t.elements[next[el]](t);
                if (t.autoScroll) {
                    window.scrollTo(0,document.body.scrollHeight);
              }
            }
          }
        };
            
        var continueButton = function (next, text, func, newRT) {
          if (!text || text == "") text = dget(t.options, "continueMessage", "Click here to continue.");
          var button = $(document.createElement("p"))
                          .css('clear', 'left')
                          .append($(document.createElement("a"))
                                    .addClass(t.cssPrefix + 'continue-link')
                                    .text("\u2192 " + text)
                          );
          return button.click(function() {
                   if (typeof func == "function") {
                     func(button);
                   }
                   $(this).css("display","none");
                   showNext(next, newRT);
                 });
        };
                
        /////////////////////////
        //
        // PROBING THIS.ELEMENTS
        //
        /////////////////////////
        var elementsToShow = [];
        var domelements = new Array(this.elements.length);
        for (var el = this.elements.length-1; el >= 0; --el) {
                
          var currentElement = this.elements[el];  
          
            // Simple line of text (paragraph)
          if (typeof currentElement == "string") {
            domelements[el] = $(document.createElement("p")).append(currentElement).addClass(this.cssPrefix + "rawText");
          }

            // Any jQuery object (use this to pass text with an ID)
          else if (currentElement.hasOwnProperty("jQueryObject")) {
            domelements[el] = $(document.createElement("p")).append(currentElement.jQueryObject).addClass(this.cssPrefix + "rawText");
          }

            // Function
          else if (typeof currentElement == "function") {
              domelements[el] = $(document.createElement("func"));
          }
            
            // Line of text (paragraph), waiting for click before printing the next elements
          else if (currentElement.hasOwnProperty("waitForClick")) {
            domelements[el] = $(document.createElement("p")).append(currentElement.waitForClick).addClass(this.cssPrefix + "waitFor");
            domelements[el].append(continueButton(elementsToShow, currentElement.buttonText, currentElement.onClick, currentElement.newRT));
            elementsToShow = [];
          }
            // Line of text (paragraph), waiting for click before printing the next elements and deleting this line
          else if (currentElement.hasOwnProperty("deleteAfterClick")) {
            domelements[el] = $(document.createElement("p")).append(currentElement.deleteAfterClick).addClass(this.cssPrefix + "deleteAfter");
            domelements[el].append(continueButton(elementsToShow, currentElement.buttonText, function (link) {
                                                    if (typeof currentElement.onClick == "function") {
                                                      currentElement.onClick();
                                                    }
                                                    link.parent().css("display","none");
                                                  }
                                   , currentElement.newRT));
            elementsToShow = [];
          }
          /*  // Function
          else if (currentElement.hasOwnProperty("func")) {
              domelements[el] = $(document.createElement("func"));
          }*/
            // Pause
          else if (currentElement.hasOwnProperty("pause")) {
              // Have to use this hack (IIFE) to make sure "elementsToShow" is interpreted right away
              (function(a, b, c) {
                  domelements[el] = $(document.createElement("pause")).attr("value", a).attr("next", b);
                  if (c) domelements[el].attr("newRT", c);
              }(currentElement.pause, elementsToShow, currentElement.newRT));
              elementsToShow = [];
          }
            // Audio file
          else if (currentElement.hasOwnProperty("audio")) {
              domelements[el] = $('<audio />', { controls : 'controls', preload : 'auto' });
              domelements[el].append($(document.createElement("source")).attr("src",currentElement.audio)).attr("controls","");
              if (currentElement.show == "none") domelements[el].addClass("display", "none");
              var wait = function () { };
              if (currentElement.hasOwnProperty("waitFor")) {
                  // Have to use this hack (IIFE) to make sure "elementsToShow" is interpreted right away
                  (function(a,b) { wait = function () { showNext(a, b); }; }(elementsToShow, currentElement.newRT));
                  elementsToShow = [];
              }
              var end = function () { };
              if (typeof currentElement.ended == "function") {
                  end = currentElement.ended;
              }
              // Have to use an IIFE to make sure "end" and "wait" are interpreted right away (infinite recursion otherwise)
              (function (end, wait) {
                t.safeBind(domelements[el], 'ended', function () { end(__Visible_picture__, __Covered_picture__); wait(); });
               }(end,wait));
          }
            // Printing one the non-element items of the control
          else if (currentElement.hasOwnProperty("this")) {
              // The context element
            if (currentElement.this == "context")
              domelements[el] = $(document.createElement("p")).append(this.context);
              // Choice between the answers
            else if (currentElement.this == "answers") {
              // The TR where the answers will be displayed
              this.xl = $(document.createElement("tr"));
              // If a position to show the keys to press has been provided
              if (currentElement.hasOwnProperty("showKeys") && currentElement.showKeys.match(/top|bottom/) && this.answerByPressingAKey != false)
                this.keyLabels = $(document.createElement("tr"));
              // The function to trigger when an answer is clicked on
              var func = currentElement.onClick;
              // Adding each answer's DOM one after another
              for (answerIndex in this.orderedAnswers) {
                  var li, answer = this.orderedAnswers[answerIndex];
                  //li = $(document.createElement("li")).addClass(this.cssPrefix + "scale-box").attr('id',answer);
                  li = $(document.createElement("td")).addClass(this.cssPrefix + "scale-box").attr('id',answer);
                    // Whether a click on one of the options goes to the next item
                  if (this.clickableAnswers) {
                    (function (li) {
                          li.mouseover(function () {
                            if (t.clickableAnswers)
                               li.css('cursor', 'pointer');
                          });
                          li.mouseout(function () {
                            if (t.clickableAnswers)
                               li.css('cursor', "default");
                          });
                    })(li);
                    (function(answer, li) {
                      li.click(function () { if (t.clickableAnswers) __Question_callback__(answer); });
                    })(answer, li);
                  }
                  var ans = this.answers[answer];
                  if (Array.isArray(ans)) ans = this.answers[answer][1];
                  var a = $(document.createElement("span")).addClass(this.cssPrefix + (this.clickableAnswers ? "fake-link" : "no-link"));
                  // Adding the 'li' TD (appended with the answer) to the 'xl' TR
                  this.xl.append(li.append(a.append(ans)));                  
                  // Printing the keys to press before/after each answer if keys have been specified for the answers
                  if (this.answerByPressingAKey != false && currentElement.hasOwnProperty("showKeys")) {
                      // Will add a SPAN inside 'li' before or after the 'a'
                      var keyLabel = $("<span>").addClass(this.cssPrefix + "keyLabel");
                      // Retrieving the key
                      if (this.answerByPressingAKey == "random")  keyLabel.html(t.randomOrder[answerIndex]);
                      else if (this.answerByPressingAKey == "associated")  keyLabel.html(t.answers[answer][0]);
                      // Position can be left, right, top or bottom
                      if (currentElement.showKeys == "left") li.prepend(keyLabel);
                      else if (currentElement.showKeys == "right") li.append(keyLabel);
                      else if (currentElement.showKeys.match(/top|bottom/)) this.keyLabels.append($("<td>").append(keyLabel));
                  }
              }
              var toShow = elementsToShow;
                // The function called when choosing the Ith picture
              __Question_callback__ = function (answer) {
                  if (!t.enabled) return;
                  t.enabled = false;
                  if (typeof func == "function") {
                    func(answer, t);
                  }
                  __Times__.push(new Date().getTime());
                  var correct = "NULL";
                  if (! (t.hasCorrect === false)) {
                    correct = (answer == t.hasCorrect);
                    t.setFlag(correct);
                  }
                  for (n = 0 ;n < __Times__.length-1 ; n++) {
                    __Questions_answers__.push([
                       [questionField, t.question ? csv_url_encode(t.question) : "NULL"],
                                   [answerField, csv_url_encode(answer)],
                                   [correctField, correct],
                                   [timeField, __Times__[n+1] - __Times__[n]]
                           ]);
                  }
                  if (t.sendResults) t.finishedCallback(__Questions_answers__);
                  else showNext(toShow);
              };
              
              var table = $("<table" + (conf_centerItems ? " align='center' style='width: 100%; text-align:center;'" : "") + ">");
              var tr = $(document.createElement("tr"));
              var td = $("<td" + (conf_centerItems ? " align='center'" : "") + ">")
              if (conf_centerItems)
                  td.attr('align', 'center');
              domelements[el] = table.append(this.xl).addClass(t.cssPrefix + 'choice');
              if (currentElement.hasOwnProperty("waitFor")) elementsToShow = [];
              // Adding the key labels if and where required
              if (this.keyLabels != undefined) {
                  if (currentElement.showKeys == "top") table.prepend(this.keyLabels);
                  else if (currentElement.showKeys == "bottom") table.append(this.keyLabels);
              }
            }
            else if (currentElement.this == "legend")
                domelements[el].append($(document.createElement("p")).append(currentElement.question).addClass(this.cssPrefix+"legend"));
            else
                assert(1==2, "Unrecognized value for 'this' ('"+currentElement.this+"') in DynamicQuestion");
                
              // End of choice between the answers
            /////////////////////////////////////////////////
              
          }
            // Just try to add anything else
          else
            domelements[el] = currentElement;
          elementsToShow.push(el);
        }
        ///////////////////////
        //
        // END OF THIS.ELEMENTS
        //
        ///////////////////////
                
        // Handling keys
        t.safeBind($(document),"keydown", function(e) {
            for (var n = 0; n < t.elements.length ; n++) {
              if ((typeof t.answers[t.answerNames[0]] != "string" || Array.isArray(t.randomOrder)) &&
                   t.elements[n].this == "answers" && domelements[n].css("display") != "none") {
                      for (i in t.orderedAnswers) {
                        var answer = t.orderedAnswers[i];
                        if ((Array.isArray(t.randomOrder) && e.keyCode == t.randomOrder[i].toUpperCase().charCodeAt(0)) ||
                            (!Array.isArray(t.randomOrder) && e.keyCode == t.answers[answer][0].toUpperCase().charCodeAt(0)))
                             __Question_callback__(answer);
                }
              }
            }
            if (typeof t.unpause == "function") t.unpause(e.keyCode);
        });
                
        var hide = false;
        for (el in domelements) {
          var ele = this.elements[el];
            
          // Add an ID if indicated
          if (ele.hasOwnProperty("id") && typeof ele.id == "string") domelements[el].attr("id", ele.id);
          
          if (hide) {
              domelements[el].css("display", "none");
          }
          else if (typeof ele == "function") {
              ele(this);
          }
          /*else if (ele.hasOwnProperty("func")) {
              ele.func(this);
          }*/
          else if (ele.hasOwnProperty("pause")) {
              var nRT = ele.newRT, next = domelements[el].attr("next").split(','), value = ele.pause.toString().match("^key(.*)");
              // If the attribute starts with "key"
              if (value) {
                (function(keys,next, RT) {
                  t.unpause = function(key)
                  {
                    if (keys.length == 0 || keys.toUpperCase().match(String.fromCharCode(key))) {
                      t.unpause = null;
                      showNext(next, RT);
                    }
                  };
                }(value[1],next, nRT)
                );
              }
              // If the attribute is a number
              else {
                // Have to use this hack (IIFE) to make sure "elementsToShow" is interpreted right away
                (function(a,b, RT) {
                    setTimeout(function () {
                      showNext(b, RT);
                    },
                    a);
                  }(ele.pause, next, nRT)
                );
              }
          }
          else if (ele.hasOwnProperty("audio")) {
              domelements[el].attr("autoplay","autoplay");
          }
          this.element.append(domelements[el]);
            
          if (ele.hasOwnProperty("waitForClick") || ele.hasOwnProperty("deleteAfterClick") || ele.hasOwnProperty("pause") ||
              ele.hasOwnProperty("waitFor")) {
                  hide = true;
          }
        }

        if (this.timeout && this.clickableAnswers) {
            var t = this;
            this.utils.setTimeout(function () {
                var answerTime = new Date().getTime();
                t.setFlag(false);
                t.finishedCallback([[[questionField, t.question ? csv_url_encode(t.question) : "NULL"],
                                     [answerField, "NULL"], [correctField, "NULL"],
                                     [timeField, answerTime - t.creationTime]]]);
            }, this.timeout);
        }

        // Store the time when this was first displayed.
        this.creationTime = new Date().getTime();
                
        __Times__.push(this.creationTime);
    }
},

properties: {
    obligatory: [],
    htmlDescription: function(opts) {
        return $(document.createElement("div")).text(opts.s || "");
    }
}
});

})();

