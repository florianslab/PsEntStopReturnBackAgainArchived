// ##########################  CLICK2UNCOVER MODULE ########################
// 
// Version 1.0 - 01.22.2016
//
// c2u is a prototype object of sorts, regrouping all the elements of the module
var c2u = (function() {
   // Local variables
   var defaultProperties = { "width": 335, "height": 180 },
       defaultDayFunction = function() { $(this).css("display", "none"); };
   // Create a patch (representing a DIV) to be used in the click2uncover element
   function Patch(properties){
       this.top = 0;                // All these default values
       this.left = 0;               // can be modified according
       this.width = 73;             // to the needs.
       this.height = 72;            // Right now they more or less
       this.background = "black";   // correspond to a calendar day
       // Using the object passed as properties
       if (typeof properties === "object") {
           for (property in properties) this[property] = properties[property];
       }
     }
   // 6 default builders for Patch, varying in positions
   Patch.prototype = {
        asMondayTop: function() { this.top = 10; this.left = 109; return this; },
        asMondayBottom: function() { this.top = 100; this.left = 109; return this; },
        asTuesdayTop: function() { this.top = 10; this.left = 181; return this; },
        asTuesdayBottom: function() { this.top = 100; this.left = 181; return this; },
        asWednesdayTop: function() { this.top = 10; this.left = 252; return this; },
        asWednesdayBottom: function() { this.top = 100; this.left = 252; return this; }
   };
   return {
     // Making defaultProperties publicly readable
     defaultProperties: defaultProperties,
     // Use c2u.newPatch({top: 240, left: 20... }) to create a new Patch
     newPatch: function(properties) { return new Patch(properties); },
     // Use c2u.newPicture("background.png", [c2u.newPatch(...), new Patch({background: "monday".png}).asMondayTop()], {width: 20, height: 20})
     // to create a new click2uncover object
     newPicture: function (picFilename, patches, parameters) {
         // Using the default width and height if none is passed
         if (parameters == null) parameters = this.defaultProperties;
         // picture is the main DIV containing all the elements
         // idPatch is self-explanatory
         // functionPatch too
         // tmpPatch represents the current patch containing the properties
         // divPatch represents the current DIV to be added
         var picture = $("<div>"), idPatch, functionPatch, tmpPatch, divPatch;
         // Defining the size of the main DIV
         picture.css(parameters);
         // click2uncover elements are of the class "patches" (useful to handle embedded elements)
         picture.attr("class", "patches");
         // Using picFilename as a background image (no effect if null)
         // 'relative' position is essential for positioning the contained elements
         picture.css({background: "url("+picFilename+")", position: "relative"});
         // Making sure that patches is an array of objects
         if (patches != null && Array.isArray(patches)) {
           for (patch in patches) {
               idPatch = patches[patch].id;
               // Have to store the function because property lost when converting to a jQuery object
               functionPatch = patches[patch].func;
               // Each DIV will be placed absolute regarding its container (relative)
               tmpPatch = $().extend({position: "absolute"}, patches[patch]);
               // Would run the function when converting if not null
               tmpPatch.func = undefined;
               divPatch = $("<div>");
               // The CSS properties are passed plain
               divPatch.css(tmpPatch);
               // If we had a custom function, bind it now
               if (typeof functionPatch == "function") divPatch.bind("click", functionPatch);
               // Adding a specific ID to the DIV
               if (typeof idPatch == "string") divPatch.attr("id", idPatch);
               // Adding the current DIV to the main DIV
               picture.append(divPatch);
           }
         }
         // The main DIV containing all the sub-DIVs
         return picture;
     }
   }
}());
//
// #########################################################################