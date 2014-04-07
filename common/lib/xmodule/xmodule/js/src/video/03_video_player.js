(function (requirejs, require, define) {

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
            duration: duration,
            isPlaying: isPlaying,
            log: log,
            onCaptionSeek: onSeek,
            onEnded: onEnded,
            onReady: onReady,
            onSpeedChange: onSpeedChange,
            onStateChange: onStateChange,
            setPlaybackRate: setPlaybackRate,
            update: update,
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

    // function _initialize(state)
    //
    //     Create any necessary DOM elements, attach them, and set their
    //     initial configuration. Also make the created DOM elements available
    //     via the 'state' object. Much easier to work this way - you don't
    //     have to do repeated jQuery element selects.
    function _initialize(state) {
        var youTubeId, player, duration;

        // The function is called just once to apply pre-defined configurations
        // by student before video starts playing. Waits until the video's
        // metadata is loaded, which normally happens just after the video
        // starts playing. Just after that configurations can be applied.
        state.videoPlayer.ready = _.once(function () {
            $(window).on('unload', state.saveState);

            if (state.currentPlayerMode !== 'flash') {
                state.videoPlayer.setPlaybackRate(state.speed);
            }
        });

        if (state.videoType === 'youtube') {
            state.videoPlayer.PlayerState = YT.PlayerState;
            state.videoPlayer.PlayerState.UNSTARTED = -1;
        } else { // if (state.videoType === 'html5') {
            state.videoPlayer.PlayerState = HTML5Video.PlayerState;
        }

        state.videoPlayer.currentTime = 0;

        state.videoPlayer.goToStartTime = true;
        state.videoPlayer.stopAtEndTime = true;

        state.videoPlayer.playerVars = {
            controls: 0,
            wmode: 'transparent',
            rel: 0,
            showinfo: 0,
            enablejsapi: 1,
            modestbranding: 1
        };

        if (state.currentPlayerMode !== 'flash') {
            state.videoPlayer.playerVars.html5 = 1;
        }

        // There is a bug which prevents YouTube API to correctly set the speed
        // to 1.0 from another speed in Firefox when in HTML5 mode. There is a
        // fix which basically reloads the video at speed 1.0 when this change
        // is requested (instead of simply requesting a speed change to 1.0).
        // This has to be done only when the video is being watched in Firefox.
        // We need to figure out what browser is currently executing this code.
        //
        // TODO: Check the status of
        // http://code.google.com/p/gdata-issues/issues/detail?id=4654
        // When the YouTube team fixes the API bug, we can remove this
        // temporary bug fix.
        state.browserIsFirefox = navigator.userAgent
            .toLowerCase().indexOf('firefox') > -1;


        if (state.currentPlayerMode === 'flash') {
            youTubeId = state.youtubeId();
        } else {
            youTubeId = state.youtubeId('1.0');
        }
        state.videoPlayer.player =  new YT.Player(state.id, {
            playerVars: state.videoPlayer.playerVars,
            videoId: youTubeId,
            events: {
                onReady: state.videoPlayer.onReady,
                onStateChange: state.videoPlayer.onStateChange,
                onPlaybackQualityChange: state.videoPlayer
                    .onPlaybackQualityChange
            }
	});


        if (state.isTouch) {
            dfd.resolve();
        }
    }

    // This function gets the video's current play position in time
    // (currentTime) and its duration.
    // It is called at a regular interval when the video is playing.
    function update() {
        this.videoPlayer.currentTime = this.videoPlayer.player.getCurrentTime();

        if (isFinite(this.videoPlayer.currentTime)) {
            this.videoPlayer.updatePlayTime(this.videoPlayer.currentTime);

            // We need to pause the video if current time is smaller (or equal)
            // than end-time. Also, we must make sure that this is only done
            // once per video playing from start to end.
            if (
                this.videoPlayer.stopAtEndTime &&
                this.videoPlayer.endTime !== null &&
                this.videoPlayer.endTime <= this.videoPlayer.currentTime
            ) {
                this.videoPlayer.stopAtEndTime = false;

                this.videoPlayer.pause();

                this.trigger('videoProgressSlider.notifyThroughHandleEnd', {
                    end: true
                });
            }
        }
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
        var duration = this.videoPlayer.duration(),
            newTime = params.time;

        if (
            (typeof newTime !== 'number') ||
            (newTime > duration) ||
            (newTime < 0)
        ) {
            return;
        }

        this.videoPlayer.log(
            'seek_video',
            {
                old_time: this.videoPlayer.currentTime,
                new_time: newTime,
                type: params.type
            }
        );

        // After the user seeks, the video will start playing from
        // the sought point, and stop playing at the end.
        this.videoPlayer.goToStartTime = false;
        if (newTime > this.videoPlayer.endTime || this.videoPlayer.endTime === null) {
            this.videoPlayer.stopAtEndTime = false;
        }

        this.videoPlayer.player.seekTo(newTime, true);

        if (this.videoPlayer.isPlaying()) {
            clearInterval(this.videoPlayer.updateInterval);
            this.videoPlayer.updateInterval = setInterval(
                this.videoPlayer.update, 200
            );

            setTimeout(this.videoPlayer.update, 0);
        } else {
            this.videoPlayer.currentTime = newTime;
        }

        this.videoPlayer.updatePlayTime(newTime);

        this.el.trigger('seek', arguments);
    }

    function onEnded() {
        var time = this.videoPlayer.duration();

        this.trigger('videoControl.pause', null);
        this.trigger('videoProgressSlider.notifyThroughHandleEnd', {
            end: true
        });

        if (this.config.showCaptions) {
            this.trigger('videoCaption.pause', null);
        }

        if (this.videoPlayer.skipOnEndedStartEndReset) {
            this.videoPlayer.skipOnEndedStartEndReset = undefined;
        }

        // Sometimes `onEnded` events fires when `currentTime` not equal
        // `duration`. In this case, slider doesn't reach the end point of
        // timeline.
        this.videoPlayer.updatePlayTime(time);

        this.el.trigger('ended', arguments);
    }


    function onReady() {
        var _this = this,
            availablePlaybackRates, baseSpeedSubs,
            player, videoWidth, videoHeight;

        dfd.resolve();

        this.videoPlayer.log('load_video');

        availablePlaybackRates = this.videoPlayer.player
                                    .getAvailablePlaybackRates();

        // Because of problems with muting sound outside of range 0.25 and
        // 5.0, we should filter our available playback rates.
        // Issues:
        //   https://code.google.com/p/chromium/issues/detail?id=264341
        //   https://bugzilla.mozilla.org/show_bug.cgi?id=840745
        //   https://developer.mozilla.org/en-US/docs/DOM/HTMLMediaElement

        availablePlaybackRates = _.filter(
            availablePlaybackRates,
            function (item) {
                var speed = Number(item);
                return speed > 0.25 && speed <= 5;
            }
        );

        if (
            this.currentPlayerMode === 'html5' &&
            this.videoType === 'youtube'
        ) {
            if (availablePlaybackRates.length === 1 && !this.isTouch) {
                // This condition is needed in cases when Firefox version is
                // less than 20. In those versions HTML5 playback could only
                // happen at 1 speed (no speed changing). Therefore, in this
                // case, we need to switch back to Flash.
                //
                // This might also happen in other browsers, therefore when we
                // have 1 speed available, we fall back to Flash.

                _restartUsingFlash(this);
            } else if (availablePlaybackRates.length > 1) {
                // We need to synchronize available frame rates with the ones
                // that the user specified.

                baseSpeedSubs = this.videos['1.0'];
                // this.videos is a dictionary containing various frame rates
                // and their associated subs.

                // First clear the dictionary.
                $.each(this.videos, function (index, value) {
                    delete _this.videos[index];
                });
                this.speeds = [];
                // Recreate it with the supplied frame rates.
                $.each(availablePlaybackRates, function (index, value) {
                    var key = value.toFixed(2).replace(/\.00$/, '.0');

                    _this.videos[key] = baseSpeedSubs;
                    _this.speeds.push(key);
                });

                this.trigger(
                    'videoSpeedControl.reRender',
                    {
                        newSpeeds: this.speeds,
                        currentSpeed: this.speed
                    }
                );
                this.setSpeed(this.speed);
                this.trigger('videoSpeedControl.setSpeed', this.speed);
            }
        }

        if (this.currentPlayerMode === 'html5') {
            this.videoPlayer.player.setPlaybackRate(this.speed);
        }

        this.el.trigger('ready', arguments);
        /* The following has been commented out to make sure autoplay is
           disabled for students.
        if (
            !this.isTouch &&
            $('.video:first').data('autoplay') === 'True'
        ) {
            this.videoPlayer.play();
        }
        */
    }

    function onStateChange(event) {
        switch (event.data) {
            case this.videoPlayer.PlayerState.UNSTARTED:
                this.videoPlayer.onUnstarted();
                break;
            case this.videoPlayer.PlayerState.PLAYING:
                this.videoPlayer.onPlay();
                break;
            case this.videoPlayer.PlayerState.PAUSED:
                this.videoPlayer.onPause();
                break;
            case this.videoPlayer.PlayerState.ENDED:
                this.videoPlayer.onEnded();
                break;
            case this.videoPlayer.PlayerState.CUED:
                this.videoPlayer.player.seekTo(this.videoPlayer.seekToTimeOnCued, true);
                // We need to call play() explicitly because after the call
                // to functions cueVideoById() followed by seekTo() the video
                // is in a PAUSED state.
                //
                // Why? This is how the YouTube API is implemented.
                this.videoPlayer.play();
                break;
        }
    }

    function isPlaying() {
        var playerState = this.videoPlayer.player.getPlayerState(),
            PLAYING = this.videoPlayer.PlayerState.PLAYING;

        return playerState === PLAYING;
    }

    /*
     * Return the duration of the video in seconds.
     *
     * First, try to use the native player API call to get the duration.
     * If the value returned by the native function is not valid, resort to
     * the value stored in the metadata for the video. Note that the metadata
     * is available only for YouTube videos.
     *
     * IMPORTANT! It has been observed that sometimes, after initial playback
     * of the video, when operations "pause" and "play" are performed (in that
     * sequence), the function will start returning a slightly different value.
     *
     * For example: While playing for the first time, the function returns 31.
     * After pausing the video and then resuming once more, the function will
     * start returning 31.950656.
     *
     * This instability is internal to the player API (or browser internals).
     */
    function duration() {
        var dur;

        // Sometimes the YouTube API doesn't finish instantiating all of it's
        // methods, but the execution point arrives here.
        //
        // This happens when you have start-time and end-time set, and click "Edit"
        // in Studio, and then "Save". The Video editor dialog closes, the
        // video reloads, but the start-end range is not visible.
        if (this.videoPlayer.player.getDuration) {
            dur = this.videoPlayer.player.getDuration();
        }

        // For YouTube videos, before the video starts playing, the API
        // function player.getDuration() will return 0. This means that the VCR
        // will show total time as 0 when the page just loads (before the user
        // clicks the Play button).
        //
        // We can do betterin a case when dur is 0 (or less than 0). We can ask
        // the getDuration() function for total time, which will query the
        // metadata for a duration.
        //
        // Be careful! Often the metadata duration is not very precise. It
        // might differ by one or two seconds against the actual time as will
        // be reported later on by the player.getDuration() API function.
        if (!isFinite(dur) || dur <= 0) {
            if (this.videoType === 'youtube') {
                dur = this.getDuration();
            }
        }

        // Just in case the metadata is garbled, or something went wrong, we
        // have a final check.
        if (!isFinite(dur) || dur <= 0) {
            dur = 0;
        }

        return Math.floor(dur);
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
