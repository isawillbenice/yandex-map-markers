define('map', [
    'jquery',
    'underscore',
    'text!../../json/config.json',
], function ($, _, config) {
    'use strict';

    var self;
    var map_options = {
        default_options: {
            center: [55.751574, 37.573856],
            zoom: 10,
            controls: []
        },

        markers_options: {
            iconImageHref: '../../images/marker.png'
        },

        controls_types: {
            zoomControl : { right: "8px", top: "125px" },
            fullscreenControl : { right: "8px", top: "15px" }
        }
    };


    function Map(map_id, options) {
        self = this;

        var markers_data = JSON.parse(config);
        ymaps.ready(function() {
            self.initialize(map_id, markers_data, options);
        });
    }

    Map.prototype = {
        initialize: function(map_id, markers_data, options) {
            self._init_map(map_id, options);
            self._init_map_controls();
            self._init_my_controls();
            self._init_templates();
            self._init_list_items(markers_data);
            self._add_markers(markers_data);
        },

        _init_map: function(map_id, options) {
            var init_options = $.extend({}, map_options.default_options, options);
            self.map = new ymaps.Map(
                map_id,
                init_options
            );
        },

        _init_templates: function() {
            this._balloon_template();
        },

        _init_map_controls: function() {
            for (var control in map_options.controls_types) {
                this.map.controls.add(control, {
                    float: 'none',
                    position: map_options.controls_types[control]
                });
            }
        },

        _init_my_controls: function() {
            $('body').on('click', '.js__map', _.bind(self.showMap, self));
            $('body').on('click', '.js__list', _.bind(self.showList, self));
        },

        _balloon_template: function() {
            self.marker_balloon_layout = ymaps.templateLayoutFactory.createClass(
                '<div class="baloon-content">' +
                '<div class="baloon-title">$[properties.name]</div>' +
                '<div class="baloon-region">$[properties.region]</div>' +
                '<div class="baloon-address"><label>Адрес: </label>$[properties.address]</div>' +
                '</div>'
            );
            ymaps.layout.storage.add('map#marker_balloon_layout', self.marker_balloon_layout);
        },

        _init_list_items: function(markers_data) {
            var template = _.template($('#list-container__items').html());
            var content = '';

            _.each(markers_data, function(item) {
                content += template(item);
            });

            $('.js__list-container__items').html(content);
        },

        _add_markers: function(markers_data) {
            var markers = [];

            var marker_options = {
                balloonContentLayout: self.marker_balloon_layout,
                balloonMaxWidth: 505,
                balloonMaxHeight: 215,
                hideIconOnBalloonOpen: false,
                iconLayout: 'default#image',
                iconImageHref: map_options.markers_options.iconImageHref,
                iconImageSize: [36, 36],
                iconImageOffset: [-18, -18]
            };


            var clusterer = new ymaps.Clusterer({
                clusterBalloonContentLayout: 'cluster#balloonCarouselContent',
                clusterBalloonItemContentLayout: self.marker_balloon_layout,
                groupByCoordinates: false,
                clusterDisableClickZoom: false,
                clusterHideIconOnBalloonOpen: false,
                geoObjectHideIconOnBalloonOpen: false
            });

            var len = markers_data.length;
            for(var i = 0; i < len; i++) {
                var marker_properties = markers_data[i];
                var latlng = marker_properties.latlng.split(',')
                var coord = [parseFloat(latlng[0]), parseFloat(latlng[1])];
                var marker = new ymaps.Placemark(coord, marker_properties, marker_options);
                markers.push(marker);
            }

            clusterer.add(markers);
            self.map.geoObjects.add(clusterer);
        },

        showMap: function() {
            $('.js__map-container').css('display', 'block');
            $('.js__list-container').css('display', 'none');
            return false;
        },

        showList: function() {
            $('.js__list-container').css('display', 'block');
            $('.js__map-container').css('display', 'none');
            return false;
        }
    }

    return Map;
});