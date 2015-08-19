var Database = {
    init: function (success, error) {
        this.db_file = "DictionaryOfNumbers.db.json";
        var self = this;
        
        $.getJSON(this.db_file, function(data){
            self.db = TAFFY(data);
        }).error(error);
    },

    loadFromJson: function (data) {
        this.db = TAFFY(data);
    },

    _getTolerance: function (siNumeral, siUnit) {
        if (siUnit === 'K' && (siNumeral >= 233 && siNumeral <= 373)) {
            // if temperature is in human range, be more exacting
            return 0.99;
        } else if (siUnit === '$' && (siNumeral < 100)) {
            // don't show money under $100
            return null;
        } else {
            return 0.9;
        }
    },

    // Returns an array of result objects based on the SI unit and value entered
    queryResults: function (siNumeral, siUnit) {
    
        var tolerance = this._getTolerance(siNumeral, siUnit);
        if (!tolerance) {
            return [];
        }

        var lowerBound = siNumeral > 0 ? siNumeral * tolerance : siNumeral / tolerance;
        var upperBound = siNumeral > 0 ? siNumeral / tolerance : siNumeral * tolerance;
        
        return this.db( { si_unit: siUnit },
                       { si_numeral: {'>=': lowerBound } },
                       { si_numeral: {'<=': upperBound } });
    }
}