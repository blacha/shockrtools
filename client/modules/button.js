var STAuth = function() {
    /* globals ClientLib, qx, ST */

    var Button = {
        name: 'Button',

        startup: function() {
            registerButtons();
            // Init the button
            ST.qx.main.getInstance();

            ST.util.button.setLabel('Scan');
        }
    };

    function registerButtons() {
        qx.Class.define('ST.qx.main', {
            type: 'singleton',
            extend: qx.core.Object,
            construct: function() {
                this.button = new qx.ui.form.Button('Login');
                this.button.set({
                    width: 100,
                    appearance: 'button-bar-center',
                    toolTipText: 'Scan'
                });

                ST.util.button = this.button;
                this.button.addListener('click', this.click, this);
                var mainBar = qx.core.Init.getApplication().getUIItem(ClientLib.Data.Missions.PATH.BAR_MENU);
                mainBar.getChildren()[1].addAt(this.button, 8, {
                    top: 0,
                    right: 0
                });
                console.log('ST:Util - Scan Button added');
            },
            members: {

                click: function() {
                    if (ST.BaseScanner.isScanning()) {
                        return ST.BaseScanner.abort();
                    }
                    ST.BaseScanner.scan();
                }
            }

        });
    }

    ST.register(Button);
};


var ST_MODULES = window.ST_MODULES || [];
ST_MODULES.push(STAuth);