// This file contains some of the base code from Dictionary Of Numbers
// originally writted by Glen Chiacchieri http://www.dictionaryofnumbers.com/
// Permission obtained to use and modify.
//
// Note: the code has been stripped down, this class now only handles
// parsing user input into SI units and quantities.

var DictionaryOfNumbers = {
    init: function() {
        // to test this regex: http://tinyurl.com/atm378c
        this.quantityRe = /[\-\$\(]?(negative)?(([\d,\s]*\.?\d+)|(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|one|two|three|four|five|six|seven|eight|nine|ten)\s)\s*([a-z]+[\s\/\-]*){1,3}\)?/gi;
        // have to do separate regexp for currency because there's no way to
        // do a conditional in a regexp, i.e. 'if it starts with a $ then
        // match 0 to 3 words after the digits part, else match 1-3 words'.
        // I tried just always matching 0-3 words after the digits, but it
        // slowed the browser down too much because of so many matches
        this.currencyRe = /\$(negative)?(([\d,\s]*\.?\d+)|(twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|one|two|three|four|five|six|seven|eight|nine|ten)\s)\s*([a-z]+[\s\/\-]*){0,3}\)?/gi;
        this.slurpRegExps = [
            this.quantityRe,
            this.currencyRe
        ];
        // need a unit regex because you can't do multiple matches with the 'g'
        // flag in javascript and also get the capture groups :///
        this.singleDigitRe = /\d/;
        this.numberRe = /[\d]*\.?\d+/;
        this.unitSeparatorRe = /[\s\-]/;
    },
    
    // Takes a user input string and returns the SI units and value 
    // as an object: { numeral, unit, unused tokens }
    findNumeralAndUnit: function(textMatch, ignoreAmbiguous) {
        // split a match found through the big ugly regex into
        // numeral and unit and return them, as well as irrelevant tokens.
        // also second parameter allows you to ignore ambiguous units

        var numeral, unit, tokens;
        textMatch = _.str.clean(textMatch); // remove extra spaces
        textMatch = textMatch.replace(/[\(\)]/g, ''); // remove parens
        // if it contains a dollar sign, then it is definitely currency.
        // this is a separate case because this unit comes at the beginning
        if (_.contains(textMatch, '$')) {
            unit = '$';
            // remove all dollar signs from the string so they don't interfere
            textMatch = textMatch.replace(/\$/g, '');
        }
        if (this.singleDigitRe.test(textMatch)) {
            // get the numeral if it's in numerical digits, not spelled out
            // remove all commas from the string, also spaces between numbers
            textMatch = textMatch.replace(/,/g, '');
            textMatch = textMatch.replace(/(\d)\s+(\d)/g, '$1$2');
            // get just the number from the string
            numeral = parseFloat(textMatch.match(this.numberRe)[0]);
            // remove the number from the string
            textMatch = textMatch.replace(this.numberRe, '');
            if (_.str.startsWith(textMatch, '-')) {
                numeral *= -1;
            }
        } else {
            // get the numeral if it's spelled out e.g. 'ninety'.
            // only match to the first english number
            var numeralAndMatch = this.parseEnglishNumbers(
                textMatch,
                this.spelledOutNumbers,
                0,
                function(memo, number) {
                    return memo !== 0 ? memo: number;
                }
            );
            numeral = numeralAndMatch[0];
            textMatch = numeralAndMatch[1];
        }

        // now parse out orders of magnitude like 'million'
        var magnitudeAndMatch = this.parseEnglishNumbers(
            textMatch,
            this.ordersOfMagnitude,
            1,
            function(memo, number) {
                return memo * number;
            }
        );
        numeral *= magnitudeAndMatch[0];
        textMatch = magnitudeAndMatch[1];

        // if the currency is known to be money, parse shortened orders of magnitude
        if (unit === '$') {
            var shortMagnitudeAndMatch = this.parseEnglishNumbers(
                textMatch,
                this.currencyOrdersOfMagnitude,
                1,
                function(memo, number) {
                    return memo * number;
                }
            );
            numeral *= shortMagnitudeAndMatch[0];
            textMatch = shortMagnitudeAndMatch[1];
        }

        // at this point, textMatch should only contain units we have to test
        tokens = _.str.words(textMatch, this.unitSeparatorRe);
        var i = tokens.length;
        var substring, irrelevantTokens, ignore;
        // test 'meters per second', then 'meters per', then 'meters'
        if (!unit) {
            for (i; i > 0; --i) {
                substring = tokens.slice(0,i).join(' ');
                ignore = ignoreAmbiguous && (substring in this.ambiguousUnits);
                if (!unit && substring in this.conversions && !ignore) {
                    // return the number, unit, and irrelevant tokens
                    unit = substring;
                    irrelevantTokens = tokens.slice(i, tokens.length);
                    break;
                }
            }
        } else if (unit === '$') {
            // don't mark shortened orders of magnitude as irrelevant
            irrelevantTokens = tokens; // if we don't find any magnitudes
            for (i = 0; i < tokens.length; ++i) {
                substring = tokens[i];
                if (substring in this.currencyOrdersOfMagnitude) {
                    // return the irrelevant tokens
                    irrelevantTokens = tokens.slice(i+1, tokens.length);
                    break;
                }
            }
        } else {
            irrelevantTokens = tokens;
        }

        return [numeral, unit, irrelevantTokens];
    },
    parseEnglishNumbers: function(textMatch, dictionary, startMemo, reducer) {
        // given some text and the dictionary to look in, returns the numeral
        var tokens = _.str.words(textMatch, this.unitSeparatorRe);
        return [_.reduce(tokens, function(memo, word) {
            word = word.toLowerCase();
            if (word in dictionary) {
                textMatch = textMatch.replace(word, '');
                return reducer(memo, dictionary[word]);
            } else {
                return memo;
            }
        }, startMemo, this), textMatch];
    },
    
    // Takes users input as a text string and returns an object 
    // with { success, siNumeral, siUnit }
    findSiNumeralAndUnit: function(textMatch, ignoreAmbiguous) {
        var numberAndUnit = this.findNumeralAndUnit(textMatch, ignoreAmbiguous),
            numeral = numberAndUnit[0],
            unit = numberAndUnit[1],
            irrelevant = numberAndUnit[2],
            siNumberAndUnit = this.convert(numeral, unit),
            result = {
                originalNumeral: numeral,
                originalUnit: unit,
                irrelevantTokens: irrelevant,
                success: false
            };

        if (unit) {
            if (unit === '$') {
                result.parsedQuery = unit + numeral;
            } else {
                // if it's an abbreviation, no space, else space
                if (unit.length > 3) {
                    result.parsedQuery = numeral+ ' ' +unit;
                } else {
                    result.parsedQuery = numeral + unit;
                }
            }
        }

        if (!_.isNull(siNumberAndUnit)) {
            result.success = true;
            result.siNumeral = siNumberAndUnit[0];
            result.siUnit = siNumberAndUnit[1];
        }
        return result;
    },
    convert: function(numeral, unit) {
        if (!(numeral && unit)) {
            return null;
        }
        var tempNumeral = numeral,
            tempUnit = unit;
        if (tempUnit in this.conversions) {
            // traverse the tree
            while (!_.isNull(this.conversions[tempUnit])) {
                // if it's a string, that's the SI abbreviation
                if (_.isString(this.conversions[tempUnit])) {
                    tempUnit = this.conversions[tempUnit];
                } else {
                // if it's a function, execute it and that's the SI conversion
                    var numeralAndUnit = this.conversions[tempUnit](numeral);
                    tempNumeral = numeralAndUnit[0];
                    tempUnit = numeralAndUnit[1];
                }
            }
            return [tempNumeral, tempUnit];
        }
        return null;
    },
    
    spelledOutNumbers: {
        twenty: 20,
        thirty: 30,
        forty: 40,
        fifty: 50,
        sixty: 60,
        seventy: 70,
        eighty: 80,
        ninety: 90,
        one: 1,
        two: 2,
        three: 3,
        four: 4,
        five: 5,
        six: 6,
        seven: 7,
        eight: 8,
        nine: 9,
        ten: 10
    },
    
    currencyOrdersOfMagnitude: {
        'k': 1e3,
        'K': 1e3,
        'm': 1e6,
        'M': 1e6,
        'b': 1e9,
        'B': 1e9,
        'bn': 1e9,
        'BN': 1e9,
        'Bn': 1e9
    },
    
    ordersOfMagnitude: {
        'negative': -1,
        'hundred': 1e2,
        'thousand': 1e3,
        'million': 1e6,
        'billion': 1e9,
        'trillion': 1e12,
        'quadrillion': 1e15,
        'quintillion': 1e18,
        'sextillion': 1e21,
        'septillion': 1e24,
        'octillion': 1e27
    },
    
    conversions: {
        // current
        'A': null,
        'amps': 'A',

        // voltage
        'V': null,

        // mass
        'kg': null,
        'kilograms': 'kg',
        'g': function(numeral) { return [numeral / 1000, 'kg']; },
        'grams': 'g',
        'pounds': function(numeral) { return [numeral / 2.2, 'kg']; },
        'lbs': 'pounds',
        'tons': function(numeral) { return [numeral * 907.185, 'kg']; },
        'metric tons': function(numeral) { return [numeral * 1000, 'kg']; },

        // length / distance
        'm': null,
        'meters': 'm',
        'metres': 'm',
        'miles': function(numeral) { return [numeral * 1609.34, 'm']; },
        'mi': 'miles',
        'mi.': 'miles',
        'micrometers': function(numeral) { return [numeral * 1e-6, 'm']; },
        'micrometres': 'micrometers',
        'microns': 'micrometers',
        'mm': function(numeral) { return [numeral * 1e-3, 'm']; },
        'millimeters': 'mm',
        'millimetres': 'mm',
        'cm': function(numeral) { return [numeral * 1e-2, 'm']; },
        'centimeters': 'cm',
        'centimetres': 'cm',
        'km': function(numeral) { return [numeral * 1000, 'm']; },
        'kilometers': 'km',
        'kilometres': 'km',
        'inches': function(numeral) { return [this.feet(numeral / 12)[0], 'm']; },
        'feet': function(numeral) { return [numeral / 3.2808, 'm']; },
        'ft': 'feet',
        'ft.': 'feet',

        // area
        'm^2': null,
        'acre': function(numeral) { return [numeral * 4046.85642, 'm^2']; },
        'acres': 'acre',
        'square meters': 'm^2',
        'mm^2': function(numeral) { return [numeral * 1e-6, 'm^2']; },
        'square mm': 'mm^2',
        'sq mm': 'mm^2',
        'sq. mm': 'mm^2',
        'sq. mm.': 'mm^2',
        'square millimeters': 'mm^2',
        'sq millimeters': 'mm^2',
        'sq. millimeters': 'mm^2',
        'square millimetres': 'mm^2',
        'sq millimetres': 'mm^2',
        'sq. millimetres': 'mm^2',
        'km^2': function(numeral) { return [numeral * 1e6, 'm^2']; },
        'square km': 'km^2',
        'sq km': 'km^2',
        'sq. km': 'km^2',
        'sq. km.': 'km^2',
        'square kilometers': 'km^2',
        'sq kilometers': 'km^2',
        'sq. kilometers': 'km^2',
        'square kilometres': 'km^2',
        'sq kilometres': 'km^2',
        'sq. kilometres': 'km^2',
        'ft^2': function(numeral) { return [numeral / 10.764, 'm^2']; },
        'square feet': 'ft^2',
        'sq feet': 'ft^2',
        'sq ft': 'ft^2',
        'sq ft.': 'ft^2',
        'square miles': function(numeral) { return [numeral * 2.59e6, 'm^2']; },

        // volume
        'm^3': null,
        'liters': function(numeral) { return [numeral * 1e-3, 'm^3']; },
        'litres': 'liters',
        'gallons': function(numeral) { return [numeral * 0.00378541178, 'm^3']; },

        // velocity / speed
        'm/s': null,
        'm / sec': 'm/s',
        'meters per second': 'm/s',
        'metres per second': 'm/s',
        'mph': function(numeral) { return [numeral * 0.44704, 'm/s']; },
        'miles per hour': 'mph',
        'miles an hour': 'mph',
        'miles / hour': 'mph',
        'miles/ hour': 'mph',
        'miles /hour': 'mph',
        'miles/hour': 'mph',
        'kph': function(numeral) { return [numeral * (10/36) ,'m/s']; },
        'kilometers per hour': 'kph',
        'kilometres per hour': 'kph',
        'kilometers / hour': 'kph',
        'kilometres / hour': 'kph',
        'kilometers/hour': 'kph',
        'kilometres/hour': 'kph',
        'km/h': 'kph',
        'km/s': function(numeral) { return [numeral * 1000, 'm/s']; },
        'kilometer per second': 'km/s',
        'kilometers per second': 'km/s',
        'kilometres per second': 'km/s',
        'km/sec': 'km/s',
        'km / sec': 'km/s',
        'c': function(numeral) { return [numeral * 299792458, 'm/s']; },

        // acceleration
        'm/s^2': null,
        'gees': function(numeral) { return [numeral * 9.80665, 'm/s^2']; },

        // time
        's': null,
        'seconds': 's',
        'nanosecond': function(numeral) { return [numeral * 1e-9, 's']; },
        'nanoseconds': 'nanosecond',
        'millisecond': function(numeral) { return [numeral * 1e-3, 's']; },
        'milliseconds': 'millisecond',
        'ms': 'millisecond',
        'minutes': function(numeral) { return [numeral * 60, 's']; },
        'min': 'minutes',
        'hours': function(numeral) { return [this.minutes(numeral)[0] * 60, 's']; },
        'hrs': 'hours',
        'days': function(numeral) { return [this.hours(numeral)[0] * 24, 's']; },
        'months': function(numeral) { return [30.4375 * this.days(numeral)[0], 's']; },
        'years': function(numeral) { return [this.days(numeral)[0] * 365, 's']; },
        'yrs': 'years',

        // energy
        'J': null,
        'joules': 'J',
        'Joules': 'J',
        'megajoules': function(numeral) { return [numeral * 1e6, 'J']; },
        'gigajoules': function(numeral) { return [numeral * 1e9, 'J']; },
        'petawatthour': function(numeral) { return [numeral * 3.6e18, 'J']; },
        'petawatthours': 'petawatthour',
        'tons of TNT': function(numeral) { return [numeral * 4.184e9, 'J'];},
        'tons of tnt': 'tons of TNT',
        'kilotons of TNT': function(numeral) { return [1000 * this['tons of TNT'](numeral)[0], 'J']; },
        'kilotons of tnt': 'kilotons of TNT',
        'kiloton of TNT': 'kilotons of TNT',
        'kiloton of tnt': 'kilotons of TNT',
        'megatons of TNT': function(numeral) { return [1000 * this['kilotons of TNT'](numeral)[0], 'J']; },
        'megatons of tnt': 'megatons of TNT',
        'megaton of TNT': 'megatons of TNT',
        'megaton of tnt': 'megatons of TNT',
        'gigatons of TNT': function(numeral) { return [1000 * this['megatons of TNT'](numeral)[0], 'J']; },
        'gigatons of tnt': 'gigatons of TNT',
        'gigaton of TNT': 'gigatons of TNT',
        'gigaton of tnt': 'gigatons of TNT',

        // force
        'N': null,
        'newtons': 'N',

        // period
        'Hz': null,
        'hertz': 'Hz',

        // luminosity
        'lm': null,
        'lumens': 'lm',

        // entropy
        'J/K': null,

        // density
        'kg/m^3': null,
        'kg/liter': function(numeral) { return [numeral * 1000, 'kg/m^3']; },
        'kg / liter': 'kg/liter',
        'kg /liter': 'kg/liter',
        'kg/ liter': 'kg/liter',

        // money
        '$': null,
        'dollars': '$',
        'USD': '$',

        // magnetic field
        'T': null,
        'teslas': 'T',

        // charge
        'C': null,
        'coulombs': 'C',

        // resistance
        'ohm': null,
        'ohms': 'ohm',
        'Ω': 'ohm',

        // power
        'W': null,
        'watts': 'W',
        'Watts': 'W',
        'mW': function(numeral) { return [numeral * 1e-3, 'W']; },
        'milliwatts': 'mW',
        'kW': function(numeral) { return [numeral * 1000, 'W']; },
        'kilowatts': 'kW',
        'MW': function(numeral) { return [numeral * 1e6, 'W']; },
        'megawatt': 'MW',
        'megawatts': 'MW',
        'GW': function(numeral) { return [numeral * 1e9, 'W']; },
        'gigawatt': 'GW',
        'gigawatts': 'GW',
        'TW': function(numeral) { return [numeral * 1e12, 'W']; },
        'terawatt': 'TW',
        'terawatts': 'TW',
        'PW': function(numeral) { return [numeral * 1e15, 'W']; },
        'petawatt': 'PW',
        'petawatts': 'PW',
        'horsepower': function(numeral) { return [numeral * 745.7, 'W']; },
        'hp': 'horsepower',

        // pressure
        'Pa': null,
        'mm Hg': function(numeral) { return [numeral*133.322368, 'Pa']; },
        'mm hg': 'mm Hg',
        'mmhg': 'mm Hg',

        // people
        'people': null,

        // temperature
        'K': null,
        'kelvins': 'K',
        'kelvin': 'K',
        'Kelvin': 'K',
        'Kelvins': 'K',
        '°F': function(numeral) { return [((numeral - 32) * 5 / 9) + 273.15, 'K']; },
        '° F': '°F',
        '°C': function(numeral) { return [numeral+273.15, 'K']; },
        '° C': '°C',
        'degrees Fahrenheit': '°F',
        'degrees fahrenheit': '°F',
        'degrees Celsius': '°C',
        'degrees celsius': '°C'
    },
    
    ambiguousUnits: {
        'm': null, // meters, million, minutes
        's': null, // pluralize, seconds
        'W': null, // often abbreviated West in street names, lat/lon
        'K': null // thousand, kelvin, kilobytes
    }
};
