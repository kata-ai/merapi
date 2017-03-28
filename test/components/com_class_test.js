"use strict";
const async = require("../../async");
const Component = require("../../lib/component");

class ComClassTest extends Component {
    constructor(comTest) {
        super();
        this.comTest = comTest;
    }
    
    *testAsync() {
    }

    *start() {
        
    }
    
    initialize() {
        return async.run(function*() {
            
        });
    }
}

module.exports = ComClassTest;