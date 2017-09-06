var Parameters = {}, 
    URLParameters = window.location.search.replace("?", "").split("&");

for (parameter in URLParameters) Parameters[URLParameters[parameter].split("=")[0]] = URLParameters[parameter].split("=")[1];

//var shuffleSequence = seq("intro", rshuffle(endsWith("Critical"),endsWith("ControlFalse"),endsWith("ControlTrue"),
//                                            endsWith("FillerTrueFal"),endsWith("FillerFalseTru")));
var shuffleSequence = seq("Instructions", "Practice", "AfterPractice", 
                          // rshuffle(not("Practice")), // The rshuffle above generates too predictable sequences
                          rshuffle(function(x){return x.match(/Critical|Filler|Control/);}), // The rshuffle above generates too predictable sequences
                          "PostExp"); 

if (!Parameters.hasOwnProperty("withsquare")) shuffleSequence = seq("Redirect");

var practiceItemTypes = ["Practice"];

var showProgressBar = false;

var defaults = [
    "DynamicQuestion",
    {
        clickableAnswers: false,
        enabled: false
    }
];

var host = "http://files.lab.florianschwarz.net/ibexfiles/Pictures/",
    audioHost = "http://files.lab.florianschwarz.net/ibexfiles/PsEntEx1ReGBAl/Audio/";

var items = [

    ["Redirect", "Message", {html: {include: "Redirect.html"}}],

    ["Instructions", "__SetCounter__", { }],
    
    ["Instructions", "Form", {html: {include: "ProlificConsentForm.html"}, continueOnReturn: true}],

    ["Instructions", "Message", {html: {include: "warning.html"}}],
    
    ["Instructions", "Message", {html: {include: "instructions.html"}}],
    
    ["AfterPractice", "Message", {html: "Very well, now let's proceed to the actual experiment."}],

    ["PostExp", "Form", {
        html: {include: "ProlificFeedbackPreConfirmation.html"}
    }],
    
    ["PostExp", "__SendResults__", {
       manualSendResults: true,
       sendingResultsMessage: "Please wait while your answers are being saved.",
       completionMessage: "Your answers have successfully being saved!"
    }],
    
    ["PostExp", "Message", {
        transfer: null,
        html: {include: "ProlificConfirmation.html"}
    }]

   ].concat(GetItemsFrom(data, null, {
       ItemGroup: ["item", "group"],
       Elements: [
           function(x){return x.Condition;},          // Name of the item: 'Condition' column
           "Preloader",
           {files: function(x){return [x.context_sound_filename, x.test_sound_filename];},
            host: audioHost,
            timeout: 1000
           },
           "Preloader",
           {files: function(x){return ["CoveredBox.png", "calendar3.png",
                     x.female_target_filename, x.ftarget_M, x.ftarget_T, x.ftarget_W,
                     x.female_filler_filename, x.ffiller_M, x.ffiller_T, x.ffiller_W,
                     x.male_target_filename, x.mtarget_M, x.mtarget_T, x.mtarget_W,
                     x.male_filler_filename, x.mfiller_M, x.mfiller_T, x.mfiller_W];},
            host: host
           },    
           "DynamicQuestion",
           {
               legend: function(x){ return [x.Condition,x.item,x.group,x.Test_Sentence].join("+"); },
               answers: function(x){ 
                   var female_target = {person:x.female_target_filename, monday: x.ftarget_M, tuesday: x.ftarget_T, wednesday: x.ftarget_W},
                       female_filler = {person:x.female_filler_filename, monday: x.ffiller_M, tuesday: x.ffiller_T, wednesday: x.ffiller_W},
                       male_target = {person:x.male_target_filename, monday: x.mtarget_M, tuesday: x.mtarget_T, wednesday: x.mtarget_W},
                       male_filler = {person:x.male_filler_filename, monday: x.mfiller_M, tuesday: x.mfiller_T, wednesday: x.mfiller_W},
                       female_target_covered = {person:x.female_target_filename, monday: "CoveredBox.png", tuesday: "CoveredBox.png", wednesday: "CoveredBox.png"},
                       female_filler_covered = {person:x.female_filler_filename, monday: "CoveredBox.png", tuesday: "CoveredBox.png", wednesday: "CoveredBox.png"},
                       male_target_covered = {person:x.male_target_filename, monday: "CoveredBox.png", tuesday: "CoveredBox.png", wednesday: "CoveredBox.png"},
                       male_filler_covered = {person:x.male_filler_filename, monday: "CoveredBox.png", tuesday: "CoveredBox.png", wednesday: "CoveredBox.png"},
                       visible, covered;
                   
                   switch (x.TargetPosition) {
                           case "top":
                               if (x.FemaleRows == "top") {
                                   visible = [female_target, female_filler, male_target, male_filler];
                                   covered = [female_target_covered, female_filler_covered, male_target_covered, male_filler_covered];  
                               }
                               else {
                                   visible = [male_target, male_filler, female_target, female_filler];
                                   covered = [male_target_covered, male_filler_covered, female_target_covered, female_filler_covered];     
                               }
                               break;
                           case "bottom":
                               if (x.FemaleRows == "top") {
                                   visible = [female_filler, female_target, male_filler, male_target];
                                   covered = [female_filler_covered, female_target_covered, male_filler_covered, male_target_covered]; 
                               }
                               else {
                                   visible = [male_filler, male_target, female_filler, female_target];
                                   covered = [male_filler_covered, male_target_covered, female_filler_covered, female_target_covered];
                               }
                   }
                   
                   return { Visible: ["F", newCalendar(visible, 3, "visible", true)], Covered: ["J", newCalendar(covered, 3, "covered", true)] };
               },
               sequence: function(x){ return [
                   // DEBUG INFORMATION
                   // "Condition: "+x.Condition+"; Item: "+x.item+"; Group: "+x.group,
                   {pause: 150},
                   //x.Context_Sentence,
                   {this: "answers", showKeys: "top"},
                   {audio: audioHost+x.context_sound_filename, waitFor:true},
                   {pause: 150, newRT: true},
                   //x.Test_Sentence,
                   {audio: audioHost+x.test_sound_filename},
                   function(t){ 
                      $("#visiblehideWednesday, #coveredhideWednesday").css("display", "none");
                      t.enabled=true;
                   }
               ];}
           }
       ]
   }));
