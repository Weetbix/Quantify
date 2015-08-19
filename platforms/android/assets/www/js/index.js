/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
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
        
        //db.init();
        DictionaryOfNumbers.init();
        
        Database.init();

        
        queryInput.change(function(){
            // First, find the number and unit from the users input
            var input = DictionaryOfNumbers.findSiNumeralAndUnit(queryInput.val(), false);
            
            var result = Database.queryResults(input.siNumeral, input.siUnit);
            
            if(result.count() == 0)
            {
                $("#results").html( $("h3").text("No results found") );
            }
            else 
            {
                var formattedResults = result.map(function(result){
                    return "<h2>" + result.human_readable + "</h2>";
                });
                
                $("#results").html(formattedResults);
            }
        });
        
        
        /*
        DictionaryOfNumbers.asYouType(
            queryInput,
            'change',
            function($target) 
            { 
                return $target.val(); 
            },
            
            function(allQuantities) {
                $("#results").html(allQuantities);
            },
            function ($target) {
                //$('#results #quantities').remove();
            }
        );*/
        
        /*
        queryInput.change(function(){
            

            
        });*/
        
        app.changeBackground();
    },

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