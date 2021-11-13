import $ from "./jquery";

/*
## Demo usage
- Try pressing record, clicking around, press record again and then click play. 
- Play creates an `<iframe>`, injects the original HTML and replays the user events. 
- To change zoom change the `REPLAY_SCALE` variable in the source code. 
- To change the playback speed change the `SPEED` variable in the source code.
*/

//fakeInputShoudbe scrollable when condition satifies.

$(function () {
      // config
      // const REPLAY_SCALE = 0.631;
      console.warn('Caret position and scroll bug in bottom')
      const REPLAY_SCALE = 0.9;
      const SPEED = 1;

      // init elements
      const $play = $("#play");
      const $record = $("#record");
      const $body = $("body");
      $play.attr("disabled", 1);

      // Data type for storing a recording
      const recording = { events: [], startTime: -1, htmlCopy: "" };

      const getScrollDuration = durationWithLastTime();

      // Record each type of event
      const handlers = [
            {
                  eventName: "mousemove",
                  handler: function handleMouseMove(e) {
                        recording.events.push({
                              type: "mousemove",
                              x: e.pageX,
                              y: e.pageY,
                              time: Date.now()
                        });
                  }
            },
            {
                  eventName: "click",
                  handler: function handleClick(e) {
                        recording.events.push({
                              type: "click",
                              target: e.target,
                              x: e.pageX,
                              y: e.pageY,
                              time: Date.now()
                        });
                  }
            },
            {
                  eventName: "keyup",
                  handler: function handleKeyPress(e) {
                        recording.events.push({
                              type: "keyup",
                              target: e.target,
                              value: e.target.value,
                              keyCode: e.keyCode,
                              time: Date.now(),
                              caretPosition: e.target.selectionStart
                        });
                  }
            },
            {
                  eventName: "keydown",
                  handler: function handleKeyPress(e) {
                        recording.events.push({
                              type: "keydown",
                              target: e.target,
                              value: e.target.value,
                              keyCode: e.keyCode,
                              time: Date.now(),
                              caretPosition: e.target.selectionStart
                        });
                  }
            },
            {
                  eventName: "selectionchange",
                  handler: function handleSelectionChange(e) {
                        let target = document.activeElement;
                        let postion = target.selectionDirection === "forward"
                              ? target.selectionEnd
                              : target.selectionStart;
                        let caret = window.getCaretCoordinates(target, postion, { debug: false });
                        let computed = window.getComputedStyle(target)
                        if (target && target.matches('input,textarea')) {
                              recording.events.push({
                                    type: "selectionchange",
                                    target,
                                    start: target.selectionStart,
                                    end: target.selectionEnd,
                                    direction: target.selectionDirection,
                                    value: target.value,
                                    time: Date.now(),
                                    caret,
                                    width: parseInt(computed["width"])
                                          - parseInt(computed["borderLeftWidth"])
                                          - parseInt(computed["borderRightWidth"]),
                                    height: parseInt(computed["height"])
                                          - parseInt(computed["borderTopWidth"])
                                          - parseInt(computed["borderBottomWidth"]),
                                    borderBottomWidth: parseInt(computed["borderBottomWidth"]),
                                    borderTopWidth: parseInt(computed["borderTopWidth"]),
                                    borderLeftWidth: parseInt(computed["borderLeftWidth"]),
                                    borderRightWidth: parseInt(computed["borderRightWidth"]),
                              })
                        }
                  }
            },
            {
                  eventName: "scroll",
                  handler: function handleKeyPress(e) {
                        recording.events.push({
                              type: "scroll",
                              target: e.target,
                              value: e.target.value,
                              time: Date.now(),
                              scrollTop: e.target.scrollTop,
                              scrollLeft: e.target.scrollLeft,
                              scrollWidth: e.target.scrollWidth,
                              scrollHeight: e.target.scrollHeight,
                              clientWidth: e.target.clientWidth,
                              clientHeight: e.target.clientHeight,
                              offsetWidth: e.target.offsetWidth,
                              offsetHeight: e.target.offsetHeight,
                              clientX: e.target.clientX,
                              clientY: e.target.clientY,
                              offsetTop: e.target.offsetTop,
                              offsetLeft: e.target.offsetLeft,
                              width: window.getComputedStyle(e.target)["width"],
                              height: window.getComputedStyle(e.target)["height"]
                        });
                  }
            }
      ];

      // Attach recording button
      $record.click(toggler(startRecording, stopRecording));
      function startRecording() {
            // start recording
            $record.text("Recording (Click again to Stop)");
            $play.attr("disabled", 1);
            recording.startTime = Date.now();
            recording.events = [];
            recording.htmlCopy = $(document.documentElement).html();
            recording.height = $(window).height();
            recording.width = $(window).width();
            handlers.map(x => listen(x.eventName, x.handler));
      }
      function stopRecording() {
            // stop recording
            $record.text("Record");
            $play.removeAttr("disabled");
            handlers.map(x => removeListener(x.eventName, x.handler));
      }

      // Replay
      $play.click(function () {
            // init iframe set scale
            const $iframe = $("<iframe>");
            $iframe.height(recording.height * REPLAY_SCALE);
            $iframe.width(recording.width * REPLAY_SCALE);
            $iframe.css({
                  "-ms-zoom": `${REPLAY_SCALE}`,
                  "-moz-transform": `scale(${REPLAY_SCALE})`,
                  "-moz-transform-origin": `0 0`,
                  "-o-transform": `scale(${REPLAY_SCALE})`,
                  "-o-transform-origin": `0 0`,
                  "-webkit-transform": `scale(${REPLAY_SCALE})`,
                  "-webkit-transform-origin": `0 0`
            });
            !$body.find("iframe").length && $body.append($iframe);

            // Load HTML
            $iframe[0].contentDocument.documentElement.innerHTML = recording.htmlCopy;
            const $iframeDoc = $($iframe[0].contentDocument.documentElement);

            // Insert fake cursor
            const $fakeCursor = $('<div class="cursor"></div>');
            $iframeDoc.find("body").append($fakeCursor);
            $iframeDoc.find("textarea").css("caret-color", "transparent");

            let i = 0;
            const startPlay = Date.now();

            (function draw() {
                  let event = recording.events[i];
                  let lastEvent = event;
                  if (!event) {
                        return;
                  }
                  let offsetRecording = event.time - recording.startTime;
                  let offsetPlay = (Date.now() - startPlay) * SPEED;
                  if (offsetPlay >= offsetRecording) {
                        i && (lastEvent = recording.events[i - 1])
                        drawEvent(event, $fakeCursor, $iframeDoc, lastEvent);
                        i++;
                  }

                  if (i < recording.events.length) {
                        requestAnimationFrame(draw);
                  } else {
                        $iframe.remove();
                  }
            })();
      });

      function drawEvent(event, $fakeCursor, $iframeDoc, lastEvent) {
            if (event.type === "click" || event.type === "mousemove") {
                  $fakeCursor.css({
                        top: event.y,
                        left: event.x
                  });
            }

            if (event.type === "click") {
                  flashClass($fakeCursor, "click");
                  const path = $(event.target).getPath();
                  const $element = $iframeDoc.find(path);
                  flashClass($element, "clicked");
                  $element.focus();
            }

            if (event.type === "keyup") {
                  const path = $(event.target).getPath();
                  const $element = $iframeDoc.find(path);
                  $element.val(event.value);
            }
            if (event.type === "keydown") {
                  const path = $(event.target).getPath();
                  const $element = $iframeDoc.find(path);
                  // $element.trigger({ type: "keyup", keyCode: event.keyCode });
            }

            if (event.type === "selectionchange") {
                  const path = $(event.target).getPath();
                  const $element = $iframeDoc.find(path);
                  $element.focus();
                  $element[0].setSelectionRange(event.start, event.end);
                  const $fakeInput = $iframeDoc.find(".fake-input");
                  const $fakeCaret = $("<div class='caret'></div>");
                  const isCaretExist = !$iframeDoc.find(".caret").length;
                  const $caret = $iframeDoc.find(".caret")[0];
                  const caretHeight = ($caret && window.getComputedStyle($caret).height) || 0;
                  // event.caret.top >= event.height
                  // ? (event.height - parseInt(caretHeight))
                  //  : 

                  if (parseInt(event.caret.top) >= (event.height
                        + event.borderBottomWidth + event.borderTopWidth)) {
                        $fakeInput.css("overflowY", "scroll");
                  }

                  console.log('caret.top',event.caret.top)
                  const style = {
                        top: event.caret.top,
                        left: event.caret.left
                  }
                  if (isCaretExist) {
                        $fakeCaret.css(style);
                        $fakeInput.append($fakeCaret);
                  } else {
                        $fakeInput.find(".caret").css(style);
                  }
            }

            if (event.type == "scroll") {
                  const path = $(event.target).getPath();
                  const $element = $iframeDoc.find(path);
                  const $fakeInput = $iframeDoc.find(".fake-input");
                  const scrollOpts = {
                        scrollTop: event.scrollTop,
                        scrollLeft: event.scrollLeft,
                        scrollWidth: event.scrollWidth,
                        scrollHeight: event.scrollHeight,
                        clientWidth: event.clientWidth,
                        clientHeight: event.clientHeight,
                        offsetWidth: event.offsetWidth,
                        offsetHeight: event.offsetHeight,
                        offsetTop: event.offsetTop,
                        offsetLeft: event.offsetLeft,
                        width: event.width,
                        height: event.height
                  }
                  const value = getScrollDuration(event.time, lastEvent);
                  $element.animate({
                        scrollTop: scrollOpts.scrollTop
                  }, value, () => { });
                  $fakeInput.animate({
                        scrollTop: scrollOpts.scrollTop
                  }, value, () => { });

            }
      }

      // Helpers

      function listen(eventName, handler) {
            // listens even if stopPropagation
            if (eventName === 'selectionchange') {
                  return document.addEventListener("selectionchange", handler);
            }
            return document.documentElement.addEventListener(eventName, handler, true);
      }

      function removeListener(eventName, handler) {
            // removes listen even if stopPropagation
            if (eventName === 'selectionchange') {
                  return document.removeEventListener(
                        eventName,
                        handler,
                        true
                  )
            }
            return document.documentElement.removeEventListener(
                  eventName,
                  handler,
                  true
            );
      }

      function flashClass($el, className) {
            $el
                  .addClass(className)
                  .delay(200)
                  .queue(() => $el.removeClass(className).dequeue());
      }

      function toggler(fn1, fn2) {
            let on = false;
            return function () {
                  return (on ? fn2() : fn1(), on = !on)
            }
      }

      function durationWithLastTime() {
            let last = 1;
            return function (currentTime, lastEvent) {
                  const res = lastEvent?.type === "scroll" ? currentTime - last : 1;
                  return (last = currentTime, res / 1000);
            }
      }
});


