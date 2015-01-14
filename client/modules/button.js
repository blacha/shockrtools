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
            this.button = new qx.ui.form.Button('Scan');
            this.button.set({
                width: 100,
                appearance: 'button-bar-right',
                toolTipText: 'Scan Layouts'
            });
            
            ST.util.button = this.button;
            this.button.addListener('click', this.click, this);
            var mainBar = qx.core.Init.getApplication().getUIItem(ClientLib.Data.Missions.PATH.BAR_MENU);
            var childs = mainBar.getChildren()[1].getChildren();
            
            for( var z = childs.length - 1; z>=0;z--){
                if( typeof childs[z].setAppearance === "function"){
                    if( childs[z].getAppearance() == "button-bar-right"){
                        childs[z].setAppearance("button-bar-center");
                    }
                }
            }
            
            mainBar.getChildren()[1].add(this.button);
            mainBar.getChildren()[0].setScale(true);
            mainBar.getChildren()[0].setWidth(860);
            
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
