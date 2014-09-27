(function(module) {
    'use strict';

    /**
     * Generic Mission Model
     * @param {string} type
     * @param {Visit} visit
     * @param {{}|[]} outcome
     * @param {number} points
     * @param {number} order Missions will be ordered according to this
     * @constructor
     */
    function Mission(type, visit, outcome, points, order) {
        this.type = type;
        this.visit = visit;
        this.outcome = outcome;
        this.points = points;
        this.receivedPoints = 0;
        this.order = order;
        this.started = false;
        this.completed = false;
        this.finalOutcome = undefined;
    }

    /**
     * Checks whether this mission has a valid outcome.
     * @returns {boolean}
     */
    Mission.prototype.hasValidOutcome = function() {
        return (typeof this.getOutcome() !== 'undefined');
    };

    /**
     * Toggle the started flag (except once completed, then
     * won't change anything any more)
     */
    Mission.prototype.toggleStarted = function() {
        if (!this.completed) {
            this.started = !this.started;
        }
    };

    /**
     * Converts this mission to JSON ready to be sent to the backend
     * @returns {{type: string, outcome: {}, points: {}}}
     */
    Mission.prototype.toJson = function() {
        var points = {};
        points[this.visit.player.team] = this.receivedPoints;
        return {
            type: this.type,
            outcome: this.getOutcome(),
            points: points
        };
    };

    /**
     * Returns the outcome of this mission. To be overwritten
     * by child classes.
     * @returns {{}}
     */
    Mission.prototype.getOutcome = function() {
        if (this.completed) {
            return this.finalOutcome;
        }
        return this.outcome;
    };

    /**
     * Concludes this mission. Should only be called once there is a valid outcome.
     */
    Mission.prototype.finish = function() {
        if (!this.completed) {
            this.receivedPoints = this.getCurrentPoints();
            this.finalOutcome = this.getOutcome();
            this.completed = true;

            // Tell the visit we are done
            this.visit.finishedMission(this);
        }
    };

    /**
     * Returns the point that the mission would make if it were completed
     * now, or the actual number of awarded points if its already completed.
     * @returns {number}
     */
    Mission.prototype.getCurrentPoints = function() {
        if (this.completed) {
            return this.receivedPoints;
        }
        return Math.min(this.points, this.visit.getRemainingAvailablePoints());
    };


    // VisitBonusMission //////////////////////////////////////////////////////
    function VisitBonusMission(visit) {
        Mission.call(this, 'visitBonus', visit, true, 50, 10);
    }

    VisitBonusMission.prototype = Object.create(Mission.prototype);
    VisitBonusMission.prototype.constructor = VisitBonusMission;


    // HasOptionsMission //////////////////////////////////////////////////////
    function HasOptionsMission(visit) {
        Mission.call(this, 'hasOptions', visit, {}, 10, 20);
        this.firstAnswers = ['yes', 'no', 'theyDoNotKnow'];
        this.secondAnswers = ['ratherYes', 'ratherNo', 'noClue'];
    }

    HasOptionsMission.prototype = Object.create(Mission.prototype);
    HasOptionsMission.prototype.constructor = HasOptionsMission;

    HasOptionsMission.prototype.getOutcome = function() {
        if (this.completed) {
            return this.finalOutcome;
        }
        var outcome;
        if (this.outcome.first === 'theyDoNotKnow') {
            outcome = this.outcome.second;
        }
        else {
            outcome = this.outcome.first;
        }
        return outcome;
    };

    // WantVeganMission //////////////////////////////////////////////////////
    function WantVeganMission(visit) {
        Mission.call(this, 'wantVegan', visit, {
            builtin: {},
            custom: []
        }, 10, 25);

        this.builtinExpressions = [
            'vegan',
            'plantbased',
            'noAnimalproducts',
            'noMeat',
            'noMilk',
            'noEggs',
            'noHoney'
        ];
    }

    WantVeganMission.prototype = Object.create(Mission.prototype);
    WantVeganMission.prototype.constructor = WantVeganMission;

    WantVeganMission.prototype.getOutcome = function() {
        if (this.completed) {
            return this.finalOutcome;
        }
        var outcome = [];
        _.forOwn(this.outcome.builtin, function(isSelected, exp) {
            if (isSelected === true) {
                outcome.push({
                    expression: exp,
                    expressionType: 'builtin'
                });
            }
        });
        _.each(this.outcome.custom, function(exp) {
            outcome.push({
                expression: exp,
                expressionType: 'custom'
            });
        });
        return outcome;
    };

    WantVeganMission.prototype.hasValidOutcome = function() {
        return (this.getOutcome().length > 0);
    };

    // WhatOptionsMission /////////////////////////////////////////////////////
    function WhatOptionsMission(visit) {
        Mission.call(this, 'whatOptions', visit, [], 10, 30);
    }

    WhatOptionsMission.prototype = Object.create(Mission.prototype);
    WhatOptionsMission.prototype.constructor = WhatOptionsMission;

    WhatOptionsMission.prototype.hasValidOutcome = function() {
        return (this.getOutcome().length > 0);
    };

    WhatOptionsMission.prototype.getOutcome = function() {
        if (this.completed) {
            return this.finalOutcome;
        }
        var outcome = [];
        _.each(this.outcome, function(o) {
            outcome.push({
                product: {
                    name: o
                },
                info: 'available'
            });
        });
        return outcome;
    };

    // BuyOptionsMission //////////////////////////////////////////////////////
    function BuyOptionsMission(visit) {
        Mission.call(this, 'buyOptions', visit, {}, 20, 40);
    }

    BuyOptionsMission.prototype = Object.create(Mission.prototype);
    BuyOptionsMission.prototype.constructor = BuyOptionsMission;

    BuyOptionsMission.prototype.hasValidOutcome = function() {
        return (this.getOutcome().length > 0);
    };

    BuyOptionsMission.prototype.getOutcome = function() {
        if (this.completed) {
            return this.finalOutcome;
        }
        var outcome = [];
        _.each(this.outcome, function(isSelected, productId) {
            if (isSelected) {
                outcome.push({
                    product: productId
                });
            }
        });
        return outcome;
    };

    // GiveFeedbackMission ////////////////////////////////////////////////////
    function GiveFeedbackMission(visit) {
        Mission.call(this, 'giveFeedback', visit, '', 20, 60);
    }

    GiveFeedbackMission.prototype = Object.create(Mission.prototype);
    GiveFeedbackMission.prototype.constructor = GiveFeedbackMission;

    GiveFeedbackMission.prototype.hasValidOutcome = function() {
        return (this.getOutcome().length > 0);
    };


    // RateOptionsMission /////////////////////////////////////////////////////
    function RateOptionsMission(visit) {
        Mission.call(this, 'rateOptions', visit, {}, 10, 50);
        this.maxRating = 5;
    }

    RateOptionsMission.prototype = Object.create(Mission.prototype);
    RateOptionsMission.prototype.constructor = RateOptionsMission;

    RateOptionsMission.prototype.hasValidOutcome = function() {
        return (this.getOutcome().length > 0);
    };

    RateOptionsMission.prototype.getOutcome = function() {
        if (this.completed) {
            return this.finalOutcome;
        }
        var outcome = [];
        _.each(this.outcome, function(rating, productId) {
            if (rating > 0) {
                outcome.push({
                    product: productId,
                    info: rating
                });
            }
        });
        return outcome;
    };

    // OfferQualityMission //////////////////////////////////////////////////////
    function OfferQualityMission(visit) {
        Mission.call(this, 'offerQuality', visit, undefined, 10, 70);
        this.maxRating = 5;
    }

    OfferQualityMission.prototype = Object.create(Mission.prototype);
    OfferQualityMission.prototype.constructor = OfferQualityMission;

    // EffortValueMission //////////////////////////////////////////////////////
    function EffortValueMission(visit) {
        Mission.call(this, 'effortValue', visit, undefined, 10, 80);
        this.possibleAnswers = ['yes', 'no'];
    }

    EffortValueMission.prototype = Object.create(Mission.prototype);
    EffortValueMission.prototype.constructor = EffortValueMission;


    module.value('missions', {
        VisitBonusMission: VisitBonusMission,
        HasOptionsMission: HasOptionsMission,
        WantVeganMission: WantVeganMission,
        WhatOptionsMission: WhatOptionsMission,
        BuyOptionsMission: BuyOptionsMission,
        GiveFeedbackMission: GiveFeedbackMission,
        RateOptionsMission: RateOptionsMission,
        OfferQualityMission: OfferQualityMission,
        EffortValueMission: EffortValueMission
    });
})(window.veganaut.mapModule);
