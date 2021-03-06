/* ============================================================================

 >4SESz.,     _,     ,gSEE2zx.,_        .azx                    ,w.
@Sh. "QEE3.  JEE3.  &ss  `*4EEEEE2x.,_  "EEV  ,aS5^;dEEEE2x.,   VEEF  _
\E2`_,gF4EEEx.?jF   EE5L       `*4EEEEE2zpn..ZEEF ;sz.  `*EEESzw.w* '|EE.
  ,dEEF   `"?j]  _,_   ,_  _,     _,.     L.EEEF  !EEF  _,,  `"``    EE7   ,,_
 :EEE7 ,ws,`|EEL`JEEL`JEE)`JEEL zE5` E3. / [EE3  ,w.  zE2` Ek .zE5^JZE3.,6EF [3
 {EEE. VEE7.EE2  AE3. EEV  ZEEL{EEL ws. ;  [EE1  EEEt{E3. JEELEE3. JE5LJEEF ,w,
  \EEk,,>^ JEEL,@EEF ZE5L,ZE5^ "Q3. V2`.    \EEk,,J' "Q[ yE2^ VE[_zEE[,"QEL V5F
          ,ss  :EE7 ;EEF               L,szzw..            ,.,            ``
          \E5.,E5F  EE1.              /; ``*4EEEZhw._      EEEL
            ````     ``              JEEE.     `"45EEEhw.,,,]

From 2010 till ∞
typecode-js v 0.1
*/

// This module uses jQuery Hashchange (http://benalman.com/projects/jquery-hashchange-plugin/)
// as a fallback to emulate pushstate behavior on browsers that don't support pushstate.
// The hashchange plugin subsequently requires jQuery Migrate (https://github.com/jquery/jquery-migrate)
// if being used with jQuery version 1.9 +

define(['jquery', 'NICookies', 'NIseed'], function($, Cookies) {

    var window = this,
    NI = window.NI;

    function PushstateHelper(options) {

        var self = this, o, internal, fn, handlers;

        o = $.extend({
            app: null,
            use_hash: false
        }, options);

        internal = {
            name: 'mod.PushstateHelper',
            initial_state: false,
            previous_path: o.use_hash ?
                window.location.hash.replace('#', '') : window.location.pathname
        };
        internal.initial_state = internal.previous_path;

        fn = {
            init: function() {
                $(document).on('click', '.js-use-pushstate, .js-simulate-pushstate, .js-do-popstate', handlers.doc_click);

                $(window).load(function () {
                    setTimeout(function () {
                        $(window).on('popstate', handlers.popstate);
                    }, 0);
                });

                $(window)
                    .on('pushstate', handlers.pushstate)
                    .on('simulate-pushstate', handlers.simulate_pushstate);

                if (o.use_hash) {
                    require(['jquery_migrate', 'hashchange'], function() {
                        $(window).on('hashchange', handlers.hashchange);
                        fn.statechange(window.location.pathname);
                    });
                } else {
                    fn.statechange(window.location.pathname);
                }
            },
            statechange: function(pathname, data){
                var path_components, _event_data, cookies;

                if (o.use_hash) {
                    pathname = pathname.replace('#', '');
                }

                path_components = PushstateHelper.get_path_components(pathname);

                _event_data = {
                    path: pathname,
                    components: path_components,
                    data: data ? data : {}
                };

                if (data && data['extraPrev']) {
                    cookies = new Cookies();
                    cookies.set_cookie('return-to-path', data['extraPrev']);
                }

                _event_data.data.previous_path = internal.previous_path;

                o.app.events.trigger('navigationEvent:Pushstate', _event_data);

                internal.previous_path = _event_data.path;
            },

            get_path_components: function(){
                return internal.components;
            }
        };

        handlers = {
            doc_click: function(e, d) {
                var $t, _href, _data;
                $t = $(this);
                if (!$t.hasClass('js-ignore-prevent-default')){
                    e.preventDefault();
                }
                _href = $t.attr('HREF');
                _data = $t.data();
                if($t.hasClass('js-use-pushstate')){
                    e.stopImmediatePropagation();
                    if(o.use_hash){
                        window.location.hash = _href;
                    } else {
                        history.pushState(null, null, _href);
                    }
                    fn.statechange(_href, _data);
                } else if($t.hasClass('js-simulate-pushstate')) {
                    e.stopImmediatePropagation();
                    fn.statechange(_href, _data);
                } else if($t.hasClass('js-do-popstate')) {
                    e.stopImmediatePropagation();
                    history.back();
                }
            },
            popstate: function(e, d) {
                var pathname, cur;
                if(o.use_hash){
                    pathname = window.location.hash;
                    cur = pathname.replace('#', '');
                } else {
                    cur = pathname = window.location.pathname;
                }
                if (internal.previous_path == cur && internal.initial_state == cur) {
                    internal.initial_state = false;
                    return;
                }
                fn.statechange(pathname, d);
            },
            pushstate: function(e, d) {
                if(o.use_hash){
                    if(window.location.hash != d.pathname){
                        window.location.hash = d.pathname;
                    }
                } else {
                    if(window.location.pathname != d.pathname){
                        history.pushState(null, null, d.pathname);
                    }
                }
                if(!d || !d.prevent_propagation){
                    fn.statechange(d.pathname, d);
                }
            },
            simulate_pushstate: function(e, d) {
                if(!d || !d.prevent_propagation){
                    fn.statechange(d.pathname, d);
                }
            },
            hashchange: function(e, d) {
                if (!d || !d.prevent_propagation) {
                    fn.statechange(window.location.hash);
                }
            }
        };

        this.get_path_components = fn.get_path_components;

        fn.init();
        console.log(internal);
    }

    PushstateHelper.get_path_components = function(path){
        var components, position;
        if(path){
            components = path.split('/');
            position = components.length;
            while(position--){
                if(!components[position].length){
                    components.splice(position,1);
                }
            }
            return components;
        }
    };

    PushstateHelper.get_get_params = function() {
        var d, get_str, get_components;
        d = {};
        get_str = window.location.search;
        if (!get_str || !get_str.length) {
            return d;
        }
        // first character is always '?'
        get_str = get_str.substring(1);
        get_components = get_str.split('&');
        $.each(get_components, function(i, component) {
            var pair;
            pair = component.split('=');
            if (pair.length) {
                d[pair[0]] = pair[1] ? pair[1] : null;
            }
        });
        return d;
    };

    NI.PushstateHelper = PushstateHelper;

    return PushstateHelper;

});
