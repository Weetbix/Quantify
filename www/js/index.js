// The main application code

var app = {
    // Application Constructor
    initialize: function () {
        this.bindEvents();
    },
    // Bind Event Listeners
    //
    // Bind any events that are required on startup. Common events are:
    // 'load', 'deviceready', 'offline', and 'online'.
    bindEvents: function () {

        // Chrome on desktop wont fire "onDeviceReady", so we need to check if we are actually running
        // on a phone, otherwise just call on device ready directly so we can get shit done.
        var is_app = document.URL.indexOf('http://') === -1 && document.URL.indexOf('https://') === -1;
        if (is_app) {
            document.addEventListener('deviceready', this.onDeviceReady, false);
        } else {
            $(document).ready(function () {
                app.onDeviceReady()
            });
        }
    },
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'receivedEvent'
    // function, we must explicitly call 'app.receivedEvent(...);'
    onDeviceReady: function () {        
        var queryInput = $("#search");
        
        DictionaryOfNumbers.init();
        Database.init();
        
        queryInput.change(function(){
            // First, find the number and unit from the users input
            var input = DictionaryOfNumbers.findSiNumeralAndUnit(queryInput.val(), false);

            var resultText = "<h2>No results found</h2>";
            var result = Database.queryResults(input.siNumeral, input.siUnit);
            
            if(result.count() !== 0)
            {
                resultText = result.map(function(result){
                    return "<h2>" + result.human_readable + "</h2>";
                });
            }
            
            $("#results").fadeOut(200, function() {
                $("#results").html(resultText);
            }).fadeIn(200);
        });
        
        app.changeBackground();
    },
    
    changeResultsText: function(text){
        $("#results").html(text);
    },

    // Show a pretty generated background
    changeBackground: function () {
        var pattern = Trianglify({
            height: window.innerHeight,
            width: window.innerWidth,
            cell_size: 60
        });

        $("body").css("background-image", 'url(' + pattern.png() + ')');
    }
};

app.initialize();