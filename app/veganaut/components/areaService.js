angular.module('veganaut.app.main').factory('areaService', [
    '$q', '$window', 'Leaflet', 'constants', 'Area', 'backendService', 'localeService',
    function($q, $window, L, constants, Area, backendService, localeService) {
        'use strict';

        /**
         * Local storage id used for storing the current area
         * @type {string}
         */
        var AREA_STORAGE_ID = 'veganautArea';

        /**
         * Service that keeps track of the Area that the user is currently
         * viewing, be it on the map, the list or anywhere else.
         * @constructor
         */
        var AreaService = function() {
            /**
             * Area that the user is currently looking at. The area is independent
             * of the format (list, map, ...) that it is shown as.
             * @type {Area}
             * @private
             */
            this._currentArea = new Area({
                lat: 0,
                lng: 0,
                zoom: 2,
                radius: constants.WHOLE_WORLD_RADIUS
            });

            /**
             * Deferred used for the initial loading of the area.
             * If it's undefined that means the loading is done and we can directly
             * return the _currentArea.
             * @type {Deferred}
             * @private
             */
            this._initialDeferred = undefined;

            // Try to load from center from local storage
            var initialised = this.setArea(new Area(
                JSON.parse($window.localStorage.getItem(AREA_STORAGE_ID) || '{}')
            ));

            // If not initialised from local storage, try backend
            if (!initialised) {
                // Set up deferred
                var that = this;
                this._initialDeferred = $q.defer();

                // Get area from IP
                backendService.getGeoIP(localeService.getLocale())
                    .then(function(res) {
                        var data = res.data;
                        if (_.isObject(data) && Object.keys(data).length > 0) {
                            that.setArea(new Area({
                                lat: data.lat,
                                lng: data.lng,
                                boundingBox: data.boundingBox,
                                name: data.countryName
                            }));
                        }
                    })
                    .finally(function() {
                        // In any case we are done initialising (either with the backend area or the default set first)
                        that._initialDeferred.resolve(that._currentArea);
                        that._initialDeferred = undefined;
                    })
                ;
            }
        };

        /**
         * Returns the current area as a promise.
         * @returns {Promise}
         */
        AreaService.prototype.getCurrentArea = function() {
            if (angular.isObject(this._initialDeferred)) {
                return this._initialDeferred.promise;
            }
            return $q.when(this._currentArea);
        };

        /**
         *
         * @param {Area} newArea
         * @returns {boolean} Whether the area was set (meaning it was valid)
         */
        AreaService.prototype.setArea = function(newArea) {
            if (newArea instanceof Area && newArea.isValid()) {
                this._currentArea = newArea;

                // Store it in local storage
                $window.localStorage.setItem(AREA_STORAGE_ID,
                    JSON.stringify(this._currentArea.toJSON())
                );

                return true;
            }

            return false;
        };

        return new AreaService();
    }
]);
