define('yandex-map-markers', [
    'jquery',
    'underscore'
], function ($, _) {
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

    var __balloon_template = function() {
        self.marker_balloon_layout = ymaps.templateLayoutFactory.createClass(
            '<div class="baloon-content">' +
            '<div class="baloon-title">$[properties.name]</div>' +
            '<div class="baloon-region">$[properties.region], $[properties.city]</div>' +
            '<div class="baloon-address">$[properties.address]</div>' +
            '</div>'
        );
        ymaps.layout.storage.add('map#marker_balloon_layout', self.marker_balloon_layout);
    };

    var __add_markers = function() {
        self.objectManager.add(self.markers_data);
    };

    function Map(map_id, options) {
        self = this;

        if(typeof ymaps == 'undefined') {
            return false;
        }

        $.ajax({
            url: '/json/data.json',
            data: {},
            success: function(data){
                console.log(data);

                self.markers_data = data;

                ymaps.ready(function() {
                    self.initialize(map_id, options);
                });
            },
            dataType: 'json'
        });
    }

    Map.prototype = {
        initialize: function(map_id, options) {
            self.init_map(map_id, options);
            self.init_ballon_template();
            self.init_map_controls();
            self.init_my_controls();
            self.init_object_manager();
            self.add_markers();
            self.getVisibleMarkers();
            //self.geolocation();
        },

        //Инициализация карты
        init_map: function(map_id, options) {
            var init_options = $.extend({}, map_options.default_options, options);
            self.map = new ymaps.Map(
                map_id,
                init_options
            );

            self.map.behaviors.disable('scrollZoom');
        },

        //Инициализация ObjectManager
        init_object_manager: function() {
            self.objectManager = new ymaps.ObjectManager({
                clusterize: true,
                geoObjectPreset: 'islands#greenDotIcon',
                geoObjectBalloonContentLayout: self.marker_balloon_layout,
                geoObjectBalloonMaxWidth: 505,
                geoObjectBalloonMaxHeight: 215,
                geoObjectHideIconOnBalloonOpen: false,
                geoObjectIconLayout: 'default#image',
                geoObjectIconImageHref: map_options.markers_options.iconImageHref,
                geoObjectIconImageSize: [36, 36],
                geoObjectIconImageOffset: [-18, -18],
                clusterBalloonContentLayout: 'cluster#balloonCarouselContent',
                clusterBalloonItemContentLayout: self.marker_balloon_layout,
                clusterballoonWidth: 505,
                clusterBalloonHeight: 215,
                clustergroupByCoordinates: false,
                clusterDisableClickZoom: false,
                clusterHideIconOnBalloonOpen: false
            });

            self.map.geoObjects.add(self.objectManager);
        },

        //Инициализация элементов урпавления для карты
        init_map_controls: function() {
            for (var control in map_options.controls_types) {
                self.map.controls.add(control, {
                    float: 'none',
                    position: map_options.controls_types[control]
                });
            }
        },

        //Инициализация дополнительных элементов управления
        init_my_controls: function() {
            self.map.events.add(['boundschange','datachange','objecttypeschange'], function(e){
                /* self.objectManager.objects.balloon.close();
                 self.objectManager.clusters.balloon.close();*/
                self.getVisibleMarkers();
            });

            $('body').on('click', '.js__show-all-addresses', _.bind(self.showAllAddresses, self));
            $('body').on('click', '.js__show-main-addresses', _.bind(self.showMainAddresses, self));
            $('body').on('click', '.js__select-address', _.bind(self.selectAddresses, self));
            $('body').on('click', '.js__select-optics', _.bind(self.selectOptics, self));
        },

        //Инициализация шаблона для балунов
        init_ballon_template: function() {
            __balloon_template();
        },

        //Добавление меток на карту
        add_markers: function() {
            __add_markers();
        },

        //Получит видимые метки
        getVisibleMarkers: function() {
            var result = ymaps.geoQuery(self.objectManager.objects).searchInside(self.map);
            result.then(function () {
                self.showOptics(result);
            });
        },

        //Центрирование по адресу
        setCenterByAddress: function(address) {
            ymaps.geocode(address, {
                results: 1
            }).then(function (res) {
                var firstGeoObject = res.geoObjects.get(0),
                    bounds = firstGeoObject.properties.get('boundedBy');

                self.map.setBounds(bounds, {
                    checkZoomRange: true
                });
            });
        },

        //Геолокация
        geolocation: function() {
            var geolocation = ymaps.geolocation;
            geolocation.get({
                provider: 'auto',
                autoReverseGeocode: true
            }).then(function (res) {
                var firstGeoObject = res.geoObjects.get(0),
                    bounds = firstGeoObject.properties.get('boundedBy');

                self.map.setBounds(bounds, {
                    checkZoomRange: true
                });
            });
        },

        //Показать оптику
        showOptics: function(optics) {
            var i = 1,
                templateOpticsItem = _.template($('#js__optics__item-template').html()),
                contentOptics = '';

            optics.each(function(optic) {
                var item = {
                    id: optic.properties.get('id'),
                    name: optic.properties.get('name'),
                    region: optic.properties.get('region'),
                    city: optic.properties.get('city'),
                    address: optic.properties.get('address'),
                    description: optic.properties.get('description'),
                    i: i
                };

                i++;
                contentOptics += templateOpticsItem(item);
            });

            $('.js__optics').html(contentOptics);
        },

        //Показать все адреса (города)
        showAllAddresses: function() {
            $('.js__all-addresses').css('display', 'block');
            $('.js__main-addresses').css('display', 'none');
            return false;
        },

        //Показать главные адреса (города)
        showMainAddresses: function() {
            $('.js__all-addresses').css('display', 'none');
            $('.js__main-addresses').css('display', 'block');
            return false;
        },

        //Выбрать адрес (город)
        selectAddresses: function(e) {
            var $el = $(e.currentTarget),
                $id = $el.attr('data-id'),
                templateSurroundingCitiesItem = _.template($('#js__surrounding-cities-item-template').html()),
                contentSurroundingCities = '',
                surrounding_cities = [];

            var finded = self.objectManager.objects.getById($id);

            var current_item = {
                id: finded.properties.id,
                region: finded.properties.region,
                city: finded.properties.city
            };

            self.objectManager.objects.each(function(object) {
                if(object.properties.region == current_item.region && object.properties.city != current_item.city) {
                    surrounding_cities.push(object.properties);
                }
            });

            surrounding_cities = _.uniq(surrounding_cities, function(el) {
                return el.city;
            });

            _.each(surrounding_cities, function(item){
                contentSurroundingCities += templateSurroundingCitiesItem(item);
            });

            self.setCenterByAddress(current_item.city);

            $('.js__select-address').removeClass('active');
            $('.js__select-address[data-id= "'+ $id + '"]').addClass('active');
            $('.js__current_city').html(current_item.city);
            $('.js__surrounding_cities').html(contentSurroundingCities);
            return false;
        },

        //Выбрать оптику
        selectOptics: function(e) {
            var $el = $(e.currentTarget),
                $id = $el.attr('data-id');

            var finded = self.objectManager.objects.getById($id);
            var coord = finded.geometry.coordinates;

            self.map.setCenter(coord, 17)
                .then(function () {
                    setTimeout(function() {
                        var objectState = self.objectManager.getObjectState($id);
                        // Проверяем, находится ли объект в видимой области карты.
                        if (objectState.isShown) {
                            // Если объект попадает в кластер, открываем балун кластера с нужным выбранным объектом.
                            if (objectState.isClustered) {
                                self.objectManager.clusters.state.set('activeObject', finded);
                                self.objectManager.clusters.balloon.open(objectState.cluster.id);
                            } else {
                                // Если объект не попал в кластер, открываем его собственный балун.
                                self.objectManager.objects.balloon.open($id);
                            }
                        }
                    }, 300);
                });

            return false;
        }
    };

    return Map;
});
