// #################  HELPER TO BUILD CALENDAR IMAGES #################
//
// Version 1.0 - 04.31.2016
//
// Changes:
//   - Added an option to specify the number of days in the calendar
//   - Added 'maxHeight' and 'maxWidth' to better deal with multiple calendars
//
// getUrlPic("file.png")
//   used for the 'background(-image)' CSS property. Need to have 'host' defined elsewhere.
function getUrlPic(picture) { return "url("+host+picture+")"; }
// getCoveredPic("file.png", function(){})
//   returns a covered box which turns into file.png once you click on it (except if "dontClick" attribute is defined)
function getCoveredPic(picture, customFunction) {
    return ["CoveredBox.png",
            function() {
                if ($(this).attr("dontClick") != undefined) return; // An attribute to handle when user can/cannot click
                if (typeof customFunction == "function") customFunction.call(this); // If a custom function was passed, call it
                $(this).css({background: getUrlPic(picture), "background-size": "cover", display: "block"}); // Revealing the picture
                // Normally, the "dontClick" attribute should be set right after the picture gets revealed
            }
           ];
}

// newCalendar([
//        {person: "boy_Don.png", monday: "bakery.png", tuesday: "bakery.png", wednesday: "bakery.png"},
//        {person: "girl_Amy.png", monday: ["CoveredBox.png", function() { $(this).css("background", getUrlPic("bakery.png")); }], tuesday: "bakery.png", wednesday: "bakery.png"}
//    ], 3);
//   returns a clic2uncover complex picture in the form of a 3-day calendar.
function newCalendar(calendars, numberOfDays, id, hideWednesday) {
    
    if (typeof id != "string") id = "";                            // Giving an ID to the calendar (and prefixing it to that of the contained elements)

    switch (numberOfDays) {
        case 7:
            var pictureCalendar = "calendar7.png",                         // Change it if you want a calendar with more or less days
                calendarPic = {width: 432, height: 66, left: 8, top: 124}, // The default position and size of the calendar grid
                person = {width: 122, height: 120, left: 158, top: 3},     // The default position and size of the character's face picture
                sunday = {width: 58, height: 58, left: 12, top: 130},      // The default position and size of the picture in the Sunday slot
                monday = {width: 58, height: 58, left: 73, top: 130},      // The default position and size of the picture in the Monday slot
                tuesday = {width: 58, height: 58, left: 134, top: 130},    // The default position and size of the picture in the Tuesday slot
                wednesday = {width: 58, height: 58, left: 195, top: 130},  // The default position and size of the picture in the Wednesday slot
                thursday = {width: 58, height: 58, left: 256, top: 130},   // The default position and size of the picture in the Thursday slot
                friday = {width: 58, height: 58, left: 317, top: 130},     // The default position and size of the picture in the Friday slot
                saturday = {width: 58, height: 58, left: 378, top: 130};   // The default position and size of the picture in the Saturday slot
                break;
        case 5:
            var pictureCalendar = "calendar.png",                          // Change it if you want a calendar with more or less days ("calendar.png" = 5 days)
                calendarPic = {width: 318, height: 66, left: 8, top: 124}, // The default position and size of the calendar grid
                person = {width: 122, height: 120, left: 100, top: 3},     // The default position and size of the character's face picture
                monday = {width: 58, height: 58, left: 13, top: 130},      // The default position and size of the picture in the Monday slot
                tuesday = {width: 58, height: 58, left: 75, top: 130},     // The default position and size of the picture in the Tuesday slot
                wednesday = {width: 58, height: 58, left: 137, top: 130},  // The default position and size of the picture in the Wednesday slot
                thursday = {width: 58, height: 58, left: 199, top: 130},   // The default position and size of the picture in the Thursday slot
                friday = {width: 58, height: 58, left: 261, top: 130};     // The default position and size of the picture in the Friday slot
                break;
        default: // 3 days
            var pictureCalendar = "calendar3.png",                         // Change it if you want a calendar with more or less days
                calendarPic = {width: 226, height: 83, left: 104, top: 6}, // The default position and size of the calendar grid
                person = {width: 99, height: 83, left: 4, top: 3},         // The default position and size of the character's face picture
                monday = {width: 65, height: 65, left: 112, top: 13},      // The default position and size of the picture in the Monday slot
                tuesday = {width: 65, height: 65, left: 185, top: 13},     // The default position and size of the picture in the Tuesday slot
                wednesday = {width: 65, height: 65, left: 260, top: 13},   // The default position and size of the picture in the Wednesday slot
                blankWednesday = {left: 254, top: 0, width: 80, height: 83, background: "white"}; // Using a DIV with a white background to mask the Wednesday
    }

    // patches is the array of objects representing the different DIV in the click2uncover element
    // yoffset increases for each row that is printed
    // patch is the object correspond to the DIV currently processed
    // tmpCalendar is updated for each row
    // maxHeight is the height of each final calendar image (maximum top+height value)
    var patches = [], yoffset = 0, patch, tmpCalendar, maxHeight = calendarPic.top+calendarPic.height, maxWidth = calendarPic.left+calendarPic.width;
    for (calendar in calendars) {
        // Updating tmpCalendar with the current row (using the pictureCalendar grid)
        tmpCalendar = $().extend({calendarPic: pictureCalendar}, calendars[calendar]);
        for (image in tmpCalendar) {
            // The current person or day object (as defined by the 'image' key -- should be 'person', 'monday', 'tuesday' or 'wednesday')
            // Its ID is the key prefixed with the global ID and suffixed with the row number
            patch = $().extend({id: id+image+yoffset}, eval(image));
            // If the value for the current person/day is a simple string, it's the picture's URL
            if (typeof tmpCalendar[image] == "string") patch.background = getUrlPic(tmpCalendar[image]);
            // Otherwise, it should be an array of which the first member is a string and the second is a custom function (TODO: handle type errors here)
            else if (Array.isArray(tmpCalendar[image])) {
                // Using the first member as the picture's URL
                patch.background = getUrlPic(tmpCalendar[image][0]);
                // Asocciating the custom function with a click on the image
                patch.func = tmpCalendar[image][1];
            }
            // Updating the maximum height
            if (patch.top+patch.height > maxHeight) maxHeight = patch.top+patch.height;
            // Updating the maximum width
            if (patch.left+patch.width > maxWidth) maxWidth = patch.left+patch.width;
            // Overwriting the 'top' property according to the current row
            patch.top += yoffset * (2+maxHeight);
            // Making sure the picture nicely fills the cell
            patch["background-size"] = "cover";
            // Adding the current element to patches
            patches.push(patch);
        }
        yoffset++;
    }

    // If we need to now show the Wednesday pics at first, add a white layer covering the region of the picture occupied by the Wednesdays
    if (hideWednesday) patches.push($().extend(blankWednesday, {height: yoffset*(maxHeight+2), background: "white", id: id+"hideWednesday"}));

    // Return the click2uncover element, containing the patches, and whose size is determined by calendarPic
    return c2u.newPicture("", patches, {width: maxWidth, height:yoffset*(maxHeight+2)});
}
//
// ##################################################################