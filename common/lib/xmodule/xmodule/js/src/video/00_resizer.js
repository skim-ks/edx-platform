(function (requirejs, require, define) {

define(
'video/00_resizer.js',
[],
function () {
    var controllerHeight = 46;

    var Resizer = function (params) {
        var defaults = {
            container: window,
            element: null,
            containerRatio: null,
            elementRatio: null,
        },
        callbacksList = [],
        module = {},
        mode = null,
        config;

        var initialize = function (params) {
            if (config) {
                config = $.extend(true, config, params);
            } else {
                config = $.extend(true, {}, defaults, params);
            }

            if (!config.element) {
                console.log(
                    '[Video info]: Required parameter `element` is not passed.'
                );
            }

            return module;
        };

        var getData = function () {
            var container = $(config.container),
                containerWidth = container.width(),
                containerHeight = container.height(),
                containerRatio = config.containerRatio,

                element = $(config.element),
                elementRatio = config.elementRatio;

            if (!containerRatio) {
                containerRatio = containerWidth/containerHeight;
            }

            if (!elementRatio) {
                elementRatio = element.width()/element.height();
            }

            return {
                containerWidth: containerWidth,
                containerHeight: containerHeight,
                containerRatio: containerRatio,
                element: element,
                elementRatio: elementRatio
            };
        };

        var align = function () {
            var data = getData();

            switch (mode) {
            case 'height':
                alignByHeightOnly();
                break;
		
            case 'width':
                alignByWidthOnly();
                break;
		
            case 'fullscreen':
                data.containerHeight -= controllerHeight;
                data.containerRatio = data.containerWidth / data.containerHeight;
                if (data.containerRatio >= data.elementRatio) {
                    alignByHeightOnly(true);
		    
                } else {
                    alignByWidthOnly(true);
                    }
                break;

            default:
                if (data.containerRatio >= data.elementRatio) {
                    alignByHeightOnly();
		    
                } else {
                    alignByWidthOnly();
                    }
                break;
            }

            fireCallbacks();

            return module;
        };

        var alignByWidthOnly = function (isFullScreen) {
            var data = getData(),
                height = data.containerWidth/data.elementRatio;

	    var topmargin;
	    if(isFullScreen){
		topmargin = 0.5*(data.containerHeight - height - controllerHeight);
	    }else{
		topmargin = 0.5*(data.containerHeight - height);
	    }
	    
            data.element.css({
                'height': height,
                'width': data.containerWidth,
                'top': topmargin,
                'left': 0
            });

            return module;
        };

        var alignByHeightOnly = function (isFullScreen) {
            var data = getData();
	    var height = data.containerHeight;
	    if(isFullScreen){
		height -= controllerHeight;
	    }
            width = height*data.elementRatio;

            data.element.css({
                'height': height,
                'width': width,
                'top': 0,
                'left': 0.5*(data.containerWidth - width)
            });

            return module;
        };

        var setMode = function (param) {
            if (_.isString(param)) {
                mode = param;
                align();
            }

            return module;
        };

        var addCallback = function (func) {
            if ($.isFunction(func)) {
                callbacksList.push(func);
            } else {
                console.error('[Video info]: TypeError: Argument is not a function.');
            }

            return module;
        };

        var addOnceCallback = function (func) {
            if ($.isFunction(func)) {
                var decorator = function () {
                    func();
                    removeCallback(func);
                };

                addCallback(decorator);
            } else {
                console.error('[Video info]: TypeError: Argument is not a function.');
            }

            return module;
        };

        var fireCallbacks = function () {
            $.each(callbacksList, function(index, callback) {
                 callback();
            });
        };

        var removeCallbacks = function () {
            callbacksList.length = 0;

            return module;
        };

        var removeCallback = function (func) {
            var index = $.inArray(func, callbacksList);

            if (index !== -1) {
                return callbacksList.splice(index, 1);
            }
        };

        initialize.apply(module, arguments);

        return $.extend(true, module, {
            align: align,
            alignByWidthOnly: alignByWidthOnly,
            alignByHeightOnly: alignByHeightOnly,
            setParams: initialize,
            setMode: setMode,
            callbacks: {
                add: addCallback,
                once: addOnceCallback,
                remove: removeCallback,
                removeAll: removeCallbacks
            }
        });
    };

    return Resizer;
});

}(RequireJS.requirejs, RequireJS.require, RequireJS.define));
