(function (requirejs, require, define) {

/*   var tag = document.createElement('script');

    tag.src = "https://www.youtube.com/iframe_api";
    var firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
*/    
    // VideoPlayer module.
    define(
	'video/03_video_player.js',
	['video/02_html5_video.js', 'video/00_resizer.js'],
	function (HTML5Video, Resizer) {
	    var dfd = $.Deferred(),
            VideoPlayer = function (state) {
		state.videoPlayer = {};
		_makeFunctionsPublic(state);
		_initialize(state);
		// No callbacks to DOM events (click, mousemove, etc.).		
		return dfd.promise();
            },
            methodsDict = {
		log: log,
		onCaptionSeek: onSeek,
		onSpeedChange: onSpeedChange,
		setPlaybackRate: setPlaybackRate,
            };
	    
	    VideoPlayer.prototype = methodsDict;
	    
	    // VideoPlayer() function - what this module "exports".
	    return VideoPlayer;
	    
	    // ***************************************************************
	    // Private functions start here.
	    // ***************************************************************
	    
	    // function _makeFunctionsPublic(state)
	    //
	    //     Functions which will be accessible via 'state' object. When called,
	    //     these functions will get the 'state' object as a context.
	    function _makeFunctionsPublic(state) {
		state.bindTo(methodsDict, state.videoPlayer, state);
	    }
	    
	    function _initialize(state) {
		var youTubeId, player, duration;

		if (state.currentPlayerMode === 'flash') {
		    youTubeId = state.youtubeId();
		} else {
		    youTubeId = state.youtubeId('1.0');
		}
	    }
	
	    function onYouTubePlayerAPIReady(playerId) {
		console.log("onYoutubePlayerAPIReady Called" );
		state.videoPlayer.player = new YT.Player('player');
		ytplayer.addEventListener("onStateChange", "onytplayerStateChange");
	    }   

	    function setPlaybackRate(newSpeed) {
		var time = this.videoPlayer.currentTime,
		methodName, youtubeId;
		
		this.videoPlayer.player.setPlaybackRate(newSpeed);
	    }
	    
	    function onSpeedChange(newSpeed) {
		var time = this.videoPlayer.currentTime,
		isFlash = this.currentPlayerMode === 'flash';
		
		if (isFlash) {
		    this.videoPlayer.currentTime = Time.convert(
			time,
			parseFloat(this.speed),
			newSpeed
		    );
		}
		
		newSpeed = parseFloat(newSpeed).toFixed(2).replace(/\.00$/, '.0');
		
		this.videoPlayer.log(
		    'speed_change_video',
		    {
			current_time: time,
			old_speed: this.speed,
			new_speed: newSpeed
		    }
		);
		
		this.setSpeed(newSpeed, true);
		this.videoPlayer.setPlaybackRate(newSpeed);
		this.el.trigger('speedchange', arguments);
		
		this.saveState(true, { speed: newSpeed });
	    }
	    
	    // Every 200 ms, if the video is playing, we call the function update, via
	    // clearInterval. This interval is called updateInterval.
	    // It is created on a onPlay event. Cleared on a onPause event.
	    // Reinitialized on a onSeek event.
	    function onSeek(params) {
		newTime = params.time;
		
		this.videoPlayer.log(
		    'seek_video',
		    {
			old_time: this.videoPlayer.currentTime,
			new_time: newTime,
			type: params.type
		    }
		);
		
		// After the user seeks, startTime and endTime are disabled. The video
		// will play from start to the end on subsequent runs.
		this.videoPlayer.startTime = 0;
		this.videoPlayer.endTime = null;
		
		this.videoPlayer.player.seekTo(newTime, true);
				
		this.el.trigger('seek', arguments);
	    }
	    
	    function log(eventName, data) {
		var logInfo;
		
		// Default parameters that always get logged.
		logInfo = {
		    'id':   this.id,
		    'code': this.youtubeId()
		};
		
		// If extra parameters were passed to the log.
		if (data) {
		    $.each(data, function (paramName, value) {
			logInfo[paramName] = value;
		    });
		}
		
		if (this.videoType === 'youtube') {
		    logInfo.code = this.youtubeId();
		} else  if (this.videoType === 'html5') {
		    logInfo.code = 'html5';
		}
		
		Logger.log(eventName, logInfo);
	    }
	});
}(RequireJS.requirejs, RequireJS.require, RequireJS.define));
