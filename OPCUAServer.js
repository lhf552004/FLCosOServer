/**
 * Created by pi on 7/21/16.
 */
/* eslint no-process-exit: 0 */
"use strict";
require("requirish")._(module);
Error.stackTraceLimit = Infinity;

var argv = require('yargs')
    .wrap(132)

    .string("alternateHostname")
    .describe("alternateHostname")
    .alias('a', 'alternateHostname')

    .number("port")
    .describe("port")
    .alias('p', 'port')
    .defaults("port", 26543)

    .number("maxAllowedSessionNumber")
    .describe("maxAllowedSessionNumber")
    .alias('m', 'maxAllowedSessionNumber')
    .defaults("maxAllowedSessionNumber", 500)

    .boolean("silent")
    .describe("slient", "no trace")

    .help("help")
    .alias("h", "help")
    .argv;

var opcua = require("node-opcua");
var _ = require("underscore");
var path = require("path");
var assert = require("assert");

var OPCUAServer = opcua.OPCUAServer;
var Variant = opcua.Variant;
var DataType = opcua.DataType;
var DataValue = opcua.DataValue;
var get_fully_qualified_domain_name = opcua.get_fully_qualified_domain_name;
var makeApplicationUrn = opcua.makeApplicationUrn;

var address_space_for_conformance_testing = require("node-opcua/lib/simulation/address_space_for_conformance_testing");
var build_address_space_for_conformance_testing = address_space_for_conformance_testing.build_address_space_for_conformance_testing;

var install_optional_cpu_and_memory_usage_node = require("node-opcua/lib/server/vendor_diagnostic_nodes").install_optional_cpu_and_memory_usage_node;

var standard_nodeset_file = opcua.standard_nodeset_file;


var port = argv.port;
var maxAllowedSessionNumber = argv.maxAllowedSessionNumber;
var maxConnectionsPerEndpoint = maxAllowedSessionNumber;

var userManager = {
    isValidUser: function (userName, password) {

        if (userName === "user1" && password === "password1") {
            return true;
        }
        if (userName === "user2" && password === "password2") {
            return true;
        }
        return false;
    }
};


var server_certificate_file = path.join(__dirname, "node_modules/node-opcua/certificates/server_selfsigned_cert_2048.pem");
//var server_certificate_file            = path.join(__dirname, "../certificates/server_selfsigned_cert_1024.pem");
//var server_certificate_file            = path.join(__dirname, "../certificates/server_cert_2048_outofdate.pem");
var server_certificate_privatekey_file = path.join(__dirname, "node_modules/node-opcua/certificates/server_key_2048.pem");

var server_options = {

    certificateFile: server_certificate_file,
    privateKeyFile: server_certificate_privatekey_file,

    port: port,
    //xx (not used: causes UAExpert to get confused) resourcePath: "UA/Server",

    maxAllowedSessionNumber: maxAllowedSessionNumber,
    maxConnectionsPerEndpoint: maxConnectionsPerEndpoint,

    nodeset_filename: [
        standard_nodeset_file,
        path.join(__dirname, "node_modules/node-opcua/nodesets/Opc.Ua.Di.NodeSet2.xml")
    ],

    serverInfo: {
        applicationUri: makeApplicationUrn(get_fully_qualified_domain_name(), "NodeOPCUA-Server"),
        productUri: "FLCos-NodeOPCUA-Server",
        applicationName: {text: "NodeOPCUA", locale: "en"},
        gatewayServerUri: null,
        discoveryProfileUri: null,
        discoveryUrls: []
    },
    buildInfo: {
        buildNumber: "1234"
    },
    serverCapabilities: {
        operationLimits: {
            maxNodesPerRead: 1000,
            maxNodesPerBrowse: 2000
        }
    },
    userManager: userManager,

    isAuditing: false
};

process.title = "Node OPCUA Server on port : " + server_options.port;

server_options.alternateHostname = argv.alternateHostname;

var server = new OPCUAServer(server_options);

var endpointUrl = server.endpoints[0].endpointDescriptions()[0].endpointUrl;

var hostname = require("os").hostname();
console.log('host name: ' + hostname);
var fs = require('fs');
var elementNodes = [];
function getElementNode(parentNode,fullName){
    var theElementNode ={};
    elementNodes.forEach(function (elemN) {
        
    });
    return theElementNode;
    
}
server.on("post_initialize", function () {

    build_address_space_for_conformance_testing(server.engine);

    install_optional_cpu_and_memory_usage_node(server);

    var addressSpace = server.engine.addressSpace;

    var rootFolder = addressSpace.findNode("RootFolder");
    assert(rootFolder.browseName.toString() === "Root");

    // fs.readFile('PLC1OPCAlias.TXT', 'utf8', function (err, data) {
    //     if (err) {
    //         console.error(err);
    //     }
    //     else {
    //         //console.log(data);
    //         var elements = data.split('\n');
    //         console.log(typeof elements);
    //         console.log(elements.length);
    //         elements.forEach( function ( element ) {
    //             var infos =[];
    //             var elementNode ={};
    //             if ( element ) {
    //                 infos = element.split( '\\t' );
    //             }
    //             if(infos.length>=2)
    //             {
    //                 var i =0;
    //                 infos.forEach(function (info) {
    //                     if(info){
    //                         switch (i)
    //                         {
    //                             case 0 :
    //
    //                                 elementNode = getElementNode(info);
    //                                 break;
    //                             case 1 :
    //                                 elementNode.address = info;
    //                                 break;
    //                             case 2 :
    //                                 elementNode.description = info;
    //                                 break;
    //                         }
    //                         i++;
    //                     }
    //                 });
    //             }
    //         } )
    //
    //     }
    //
    // });

    //PLC
    var PLC1 = addressSpace.addFolder(rootFolder.objects, {browseName: "PLC1"});
    //console.log('rootFolder.objects: '+rootFolder.objects);
    //console.log('PLC1: '+PLC1);
    //INT1 intake interface
    var LBCB = addressSpace.addFolder(PLC1, {browseName: "LBCB"});
    //INT elevator
    var LBEB = addressSpace.addFolder(PLC1, {browseName: "LBEB"});
    //Storages
    var BIN1 = addressSpace.addFolder(PLC1, {browseName: "BIN1"});
    var BIN2 = addressSpace.addFolder(PLC1, {browseName: "BIN2"});
    var BIN3 = addressSpace.addFolder(PLC1, {browseName: "BIN3"});
    var BIN4 = addressSpace.addFolder(PLC1, {browseName: "BIN4"});
    var BIN5 = addressSpace.addFolder(PLC1, {browseName: "BIN5"});
    var BIN6 = addressSpace.addFolder(PLC1, {browseName: "BIN6"});
    var BIN7 = addressSpace.addFolder(PLC1, {browseName: "BIN7"});
    //bin commands, hardwareIO and Information
    var BIN1_Commands = addressSpace.addFolder(BIN1, {browseName: "Commands"});
    var BIN1_HardwareIO = addressSpace.addFolder(BIN1, {browseName: "HardwareIO"});
    var BIN1_Information = addressSpace.addFolder(BIN1, {browseName: "Information"});
    var BIN1_Parameter = addressSpace.addFolder(BIN1, {browseName: "Parameter"});
    var BIN1_States = addressSpace.addFolder(BIN1, {browseName: "States"});
    //commands
    var CmdOverrideLL = addressSpace.addVariable({
        organizedBy: BIN1_Commands,
        browseName: "CmdOverrideLL",
        nodeId: "ns=1;s=CmdOverrideLL",
        dataType: "Boolean",
        value: new Variant({dataType: DataType.Boolean, value: false})
    });
    var CmdOverrideHL = addressSpace.addVariable({
        organizedBy: BIN1_Commands,
        browseName: "CmdOverrideHL",
        nodeId: "ns=1;s=CmdOverrideHL",
        dataType: "Boolean",
        value: new Variant({dataType: DataType.Boolean, value: false})
    });
    var CmdDischarging = addressSpace.addVariable({
        organizedBy: BIN1_Commands,
        browseName: "CmdDischarging",
        nodeId: "ns=1;s=CmdDischarging",
        dataType: "Boolean",
        value: new Variant({dataType: DataType.Boolean, value: false})
    });
    var CmdFilling = addressSpace.addVariable({
        organizedBy: BIN1_Commands,
        browseName: "CmdFilling",
        nodeId: "ns=1;s=CmdFilling",
        dataType: "Boolean",
        value: new Variant({dataType: DataType.Boolean, value: false})
    });
    var CmdLastReceiverActive = addressSpace.addVariable({
        organizedBy: BIN1_Commands,
        browseName: "CmdLastReceiverActive",
        nodeId: "ns=1;s=CmdLastReceiverActive",
        dataType: "Boolean",
        value: new Variant({dataType: DataType.Boolean, value: false})
    });
    var CmdLastSenderActive = addressSpace.addVariable({
        organizedBy: BIN1_Commands,
        browseName: "CmdLastSenderActive",
        nodeId: "ns=1;s=CmdLastSenderActive",
        dataType: "Boolean",
        value: new Variant({dataType: DataType.Boolean, value: false})
    });

    //hardwareIO
    var InLowLevel = addressSpace.addVariable({
        organizedBy: BIN1_HardwareIO,
        browseName: "InLowLevel",
        nodeId: "ns=1;s=InLowLevel",
        dataType: "Boolean",
        value: new Variant({dataType: DataType.Boolean, value: false})
    });
    var InFeedOffLL = addressSpace.addVariable({
        organizedBy: BIN1_HardwareIO,
        browseName: "InFeedOffLL",
        nodeId: "ns=1;s=InFeedOffLL",
        dataType: "Boolean",
        value: new Variant({dataType: DataType.Boolean, value: false})
    });
    var InHighLevel = addressSpace.addVariable({
        organizedBy: BIN1_HardwareIO,
        browseName: "InHighLevel",
        nodeId: "ns=1;s=InHighLevel",
        dataType: "Boolean",
        value: new Variant({dataType: DataType.Boolean, value: false})
    });
    var InFeedOffHL = addressSpace.addVariable({
        organizedBy: BIN1_HardwareIO,
        browseName: "InFeedOffHL",
        nodeId: "ns=1;s=InFeedOffHL",
        dataType: "Boolean",
        value: new Variant({dataType: DataType.Boolean, value: false})
    });
    var InOutEmpty = addressSpace.addVariable({
        organizedBy: BIN1_HardwareIO,
        browseName: "InOutEmpty",
        nodeId: "ns=1;s=InOutEmpty",
        dataType: "Boolean",
        value: new Variant({dataType: DataType.Boolean, value: false})
    });
    var InDPFaultLL = addressSpace.addVariable({
        organizedBy: BIN1_HardwareIO,
        browseName: "InDPFaultLL",
        nodeId: "ns=1;s=InDPFaultLL",
        dataType: "Boolean",
        value: new Variant({dataType: DataType.Boolean, value: false})
    });
    var InDPFaultHL = addressSpace.addVariable({
        organizedBy: BIN1_HardwareIO,
        browseName: "InDPFaultHL",
        nodeId: "ns=1;s=InDPFaultHL",
        dataType: "Boolean",
        value: new Variant({dataType: DataType.Boolean, value: false})
    });
    var InRefillLevel = addressSpace.addVariable({
        organizedBy: BIN1_HardwareIO,
        browseName: "InRefillLevel",
        nodeId: "ns=1;s=InRefillLevel",
        dataType: "Boolean",
        value: new Variant({dataType: DataType.Boolean, value: false})
    });


    var OutLowLevel = addressSpace.addVariable({
        organizedBy: BIN1_HardwareIO,
        browseName: "OutLowLevel",
        nodeId: "ns=1;s=OutLowLevel",
        dataType: "Boolean",
        value: new Variant({dataType: DataType.Boolean, value: false})
    });
    var OutHighLevel = addressSpace.addVariable({
        organizedBy: BIN1_HardwareIO,
        browseName: "OutHighLevel",
        nodeId: "ns=1;s=OutHighLevel",
        dataType: "Boolean",
        value: new Variant({dataType: DataType.Boolean, value: false})
    });
    var OutDischarging = addressSpace.addVariable({
        organizedBy: BIN1_HardwareIO,
        browseName: "OutDischarging",
        nodeId: "ns=1;s=OutDischarging",
        dataType: "Boolean",
        value: new Variant({dataType: DataType.Boolean, value: false})
    });
    var OutFilling = addressSpace.addVariable({
        organizedBy: BIN1_HardwareIO,
        browseName: "OutFilling",
        nodeId: "ns=1;s=OutFilling",
        dataType: "Boolean",
        value: new Variant({dataType: DataType.Boolean, value: false})
    });
    var OutFull = addressSpace.addVariable({
        organizedBy: BIN1_HardwareIO,
        browseName: "OutFull",
        nodeId: "ns=1;s=OutFull",
        dataType: "Boolean",
        value: new Variant({dataType: DataType.Boolean, value: false})
    });
    var OutOverrideLL = addressSpace.addVariable({
        organizedBy: BIN1_HardwareIO,
        browseName: "OutOverrideLL",
        nodeId: "ns=1;s=OutOverrideLL",
        dataType: "Boolean",
        value: new Variant({dataType: DataType.Boolean, value: false})
    });
    var OutOverrideHL = addressSpace.addVariable({
        organizedBy: BIN1_HardwareIO,
        browseName: "OutOverrideHL",
        nodeId: "ns=1;s=OutOverrideHL",
        dataType: "Boolean",
        value: new Variant({dataType: DataType.Boolean, value: false})
    });
    var OutDryFillingDone = addressSpace.addVariable({
        organizedBy: BIN1_HardwareIO,
        browseName: "OutDryFillingDone",
        nodeId: "ns=1;s=OutDryFillingDone",
        dataType: "Boolean",
        value: new Variant({dataType: DataType.Boolean, value: false})
    });
    var OutLastReceiverActive = addressSpace.addVariable({
        organizedBy: BIN1_HardwareIO,
        browseName: "OutLastReceiverActive",
        nodeId: "ns=1;s=OutLastReceiverActive",
        dataType: "Boolean",
        value: new Variant({dataType: DataType.Boolean, value: false})
    });
    var OutLastSenderActive = addressSpace.addVariable({
        organizedBy: BIN1_HardwareIO,
        browseName: "OutLastSenderActive",
        nodeId: "ns=1;s=OutLastSenderActive",
        dataType: "Boolean",
        value: new Variant({dataType: DataType.Boolean, value: false})
    });
    //variables
    var VarInLowLevel = addressSpace.addVariable({
        organizedBy: BIN1_Parameter,
        browseName: "VarInLowLevel",
        nodeId: "ns=1;s=VarInLowLevel",
        dataType: "Boolean",
        value: new Variant({dataType: DataType.Boolean, value: false})
    });
    var InReceiverCounter = addressSpace.addVariable({
        organizedBy: BIN1_Parameter,
        browseName: "InReceiverCounter",
        nodeId: "ns=1;s=InReceiverCounter",
        dataType: "Byte",
        value: new Variant({dataType: DataType.Byte, value: 0})
    });
    var OutReceiverCounter = addressSpace.addVariable({
        organizedBy: BIN1_Parameter,
        browseName: "OutReceiverCounter",
        nodeId: "ns=1;s=OutReceiverCounter",
        dataType: "Byte",
        value: new Variant({dataType: DataType.Byte, value: 0})
    });
    var InOutOverfillWeight = addressSpace.addVariable({
        organizedBy: BIN1_Parameter,
        browseName: "InOutOverfillWeight",
        nodeId: "ns=1;s=InOutOverfillWeight",
        dataType: "Double",
        value: new Variant({dataType: DataType.Double, value: 0.0})
    });
    var InOutFillingWeight = addressSpace.addVariable({
        organizedBy: BIN1_Parameter,
        browseName: "InOutFillingWeight",
        nodeId: "ns=1;s=InOutFillingWeight",
        dataType: "Double",
        value: new Variant({dataType: DataType.Double, value: 0.0})
    });
    var InFillLevel = addressSpace.addVariable({
        organizedBy: BIN1_Parameter,
        browseName: "InFillLevel",
        nodeId: "ns=1;s=InFillLevel",
        dataType: "Double",
        value: new Variant({dataType: DataType.Double, value: 0.0})
    });
    var InRestdischargeWeight = addressSpace.addVariable({
        organizedBy: BIN1_Parameter,
        browseName: "InRestdischargeWeight",
        nodeId: "ns=1;s=InRestdischargeWeight",
        dataType: "Double",
        value: new Variant({dataType: DataType.Double, value: 0.0})
    });

    var ParLL_isBelowBin = addressSpace.addVariable({
        organizedBy: BIN1_Parameter,
        browseName: "ParLL_isBelowBin",
        nodeId: "ns=1;s=ParLL_isBelowBin",
        dataType: "Boolean",
        value: new Variant({dataType: DataType.Boolean, value: false})
    });

    //hand take
    var HT = addressSpace.addFolder(PLC1, {browseName: "HT"});
    //scales
    var Scale1 = addressSpace.addFolder(PLC1, {browseName: "Scale1"});
    var Scale2 = addressSpace.addFolder(PLC1, {browseName: "Scale2"});
    //it's for hand take
    var Scale3 = addressSpace.addFolder(PLC1, {browseName: "Scale3"});
    //Mix1
    var Mixer1 = addressSpace.addFolder(PLC1, {browseName: "Mixer1"});
    //packing stations
    var PK1 = addressSpace.addFolder(PLC1, {browseName: "PK1"});
    var PK2 = addressSpace.addFolder(PLC1, {browseName: "PK2"});

    //Sections
    var Section1 = addressSpace.addFolder(PLC1, {browseName: "Section1"});
    var Section2 = addressSpace.addFolder(PLC1, {browseName: "Section2"});
    var Section3 = addressSpace.addFolder(PLC1, {browseName: "Section3"});
    var Section4 = addressSpace.addFolder(PLC1, {browseName: "Section4"});

    //Lines
    var INT1 = addressSpace.addFolder(PLC1, {browseName: "INT1"});
    var INT2 = addressSpace.addFolder(PLC1, {browseName: "INT2"});
    var MIX1 = addressSpace.addFolder(PLC1, {browseName: "MIX1"});

    /**
     * variation 0:
     * ------------
     *
     * Add a variable in folder using a raw Variant.
     * Use this variation when the variable has to be read or written by the OPCUA clients
     */
    var variable0 = addressSpace.addVariable({
        organizedBy: PLC1,
        browseName: "FanSpeed",
        nodeId: "ns=1;s=FanSpeed",
        dataType: "Double",
        value: new Variant({dataType: DataType.Double, value: 1000.0})
    });

    setInterval(function () {
        var fluctuation = Math.random() * 100 - 50;
        variable0.setValueFromSource(new Variant({dataType: DataType.Double, value: 1000.0 + fluctuation}));
    }, 10);


    /**
     * variation 1:
     * ------------
     *
     * Add a variable in folder using a single get function which returns the up to date variable value in Variant.
     * The server will set the timestamps automatically for us.
     * Use this variation when the variable value is controlled by the getter function
     * Avoid using this variation if the variable has to be made writable, as the server will call the getter
     * function prior to returning its value upon client read requests.
     */
    addressSpace.addVariable({
        organizedBy: PLC1,
        browseName: "PumpSpeed",
        nodeId: "ns=1;s=PumpSpeed",
        dataType: "Double",
        value: {
            /**
             * returns the  current value as a Variant
             * @method get
             * @return {Variant}
             */
            get: function () {
                var pump_speed = 200 + 100 * Math.sin(Date.now() / 10000);
                return new Variant({dataType: DataType.Double, value: pump_speed});
            }
        }
    });

    addressSpace.addVariable({
        organizedBy: PLC1,
        browseName: "SomeDate",
        nodeId: "ns=1;s=SomeDate",
        dataType: "DateTime",
        value: {
            get: function () {
                return new Variant({dataType: DataType.DateTime, value: new Date(Date.UTC(2016, 9, 13, 8, 40, 0))});
            }
        }
    });


    /**
     * variation 2:
     * ------------
     *
     * Add a variable in folder. This variable gets its value and source timestamps from the provided function.
     * The value and source timestamps are held in a external object.
     * The value and source timestamps are updated on a regular basis using a timer function.
     */
    var external_value_with_sourceTimestamp = new opcua.DataValue({
        value: new Variant({dataType: DataType.Double, value: 10.0}),
        sourceTimestamp: null,
        sourcePicoseconds: 0
    });
    setInterval(function () {
        external_value_with_sourceTimestamp.value.value = Math.random();
        external_value_with_sourceTimestamp.sourceTimestamp = new Date();
    }, 1000);

    addressSpace.addVariable({
        organizedBy: PLC1,
        browseName: "Pressure",
        nodeId: "ns=1;s=Pressure",
        dataType: "Double",
        value: {
            timestamped_get: function () {
                return external_value_with_sourceTimestamp;
            }
        }
    });


    /**
     * variation 3:
     * ------------
     *
     * Add a variable in a folder. This variable gets its value  and source timestamps from the provided
     * asynchronous function.
     * The asynchronous function is called only when needed by the opcua Server read services and monitored item services
     *
     */

    addressSpace.addVariable({
        organizedBy: PLC1,
        browseName: "Temperature",
        nodeId: "ns=1;s=Temperature",
        dataType: "Double",

        value: {
            refreshFunc: function (callback) {

                var temperature = 20 + 10 * Math.sin(Date.now() / 10000);
                var value = new Variant({dataType: DataType.Double, value: temperature});
                var sourceTimestamp = new Date();

                // simulate a asynchronous behaviour
                setTimeout(function () {
                    callback(null, new DataValue({value: value, sourceTimestamp: sourceTimestamp}));
                }, 100);
            }
        }
    });

    // UAAnalogItem
    // add a UAAnalogItem
    var node = addressSpace.addAnalogDataItem({

        organizedBy: PLC1,

        nodeId: "ns=1;s=TemperatureAnalogItem",
        browseName: "TemperatureAnalogItem",
        definition: "(tempA -25) + tempB",
        valuePrecision: 0.5,
        engineeringUnitsRange: {low: 100, high: 200},
        instrumentRange: {low: -100, high: +200},
        engineeringUnits: opcua.standardUnits.degree_celsius,
        dataType: "Double",
        value: {
            get: function () {
                return new Variant({dataType: DataType.Double, value: Math.random() + 19.0});
            }
        }
    });


    //------------------------------------------------------------------------------
    // Add a view
    //------------------------------------------------------------------------------
    var view = addressSpace.addView({
        organizedBy: rootFolder.views,
        browseName: "MyView"
    });

    view.addReference({
        referenceType: "Organizes",
        nodeId: node.nodeId
    });
});


function dumpObject(obj) {
    function w(str, width) {
        var tmp = str + "                                        ";
        return tmp.substr(0, width);
    }

    return _.map(obj, function (value, key) {
        return "      " + w(key, 30).green + "  : " + ((value === null) ? null : value.toString());
    }).join("\n");
}


console.log("  server PID          :".yellow, process.pid);

server.start(function (err) {
    if (err) {
        console.log(" Server failed to start ... exiting");
        process.exit(-3);
    }
    console.log("  server on port      :".yellow, server.endpoints[0].port.toString().cyan);
    console.log("  endpointUrl         :".yellow, endpointUrl.cyan);

    console.log("  serverInfo          :".yellow);
    console.log(dumpObject(server.serverInfo));
    console.log("  buildInfo           :".yellow);
    console.log(dumpObject(server.engine.buildInfo));

    console.log("\n  server now waiting for connections. CTRL+C to stop".yellow);

    if (argv.silent) {
        console.log(" silent");
        console.log = function () {
        }
    }
    //  console.log = function(){};

});

server.on("create_session", function (session) {

    console.log(" SESSION CREATED");
    console.log("    client application URI: ".cyan, session.clientDescription.applicationUri);
    console.log("        client product URI: ".cyan, session.clientDescription.productUri);
    console.log("   client application name: ".cyan, session.clientDescription.applicationName.toString());
    console.log("   client application type: ".cyan, session.clientDescription.applicationType.toString());
    console.log("              session name: ".cyan, session.sessionName ? session.sessionName.toString() : "<null>");
    console.log("           session timeout: ".cyan, session.sessionTimeout);
    console.log("                session id: ".cyan, session.sessionId);
});

server.on("session_closed", function (session, reason) {
    console.log(" SESSION CLOSED :", reason);
    console.log("              session name: ".cyan, session.sessionName ? session.sessionName.toString() : "<null>");
});

function w(s, w) {
    return ("000" + s).substr(-w);
}
function t(d) {
    return w(d.getHours(), 2) + ":" + w(d.getMinutes(), 2) + ":" + w(d.getSeconds(), 2) + ":" + w(d.getMilliseconds(), 3);
}

server.on("response", function (response) {

    if (argv.silent) {
        return
    }
    ;

    console.log(t(response.responseHeader.timeStamp), response.responseHeader.requestHandle,
        response._schema.name.cyan, " status = ", response.responseHeader.serviceResult.toString().cyan);
    switch (response._schema.name) {
        case "xxModifySubscriptionResponse":
        case "xxCreateMonitoredItemsResponse":
        case "xxModifyMonitoredItemsResponse":
        case "xxRepublishResponse":
        case "xxCreateSessionResponse":
        case "xxActivateSessionResponse":
        case "xxCloseSessionResponse":
        case "xxBrowseResponse":
        case "xxCreateSubscriptionResponse":
        case "xxTranslateBrowsePathsToNodeIdsResponse":
        case "xxSetPublishingModeResponse":
            console.log(response.toString());
            break;
        case "xxPublishResponse":
            console.log(response.toString());
            console.log("PublishResponse.subscriptionId = ", response.subscriptionId.toString());
            break;
    }

});

function indent(str, nb) {
    var spacer = "                                             ".slice(0, nb);
    return str.split("\n").map(function (s) {
        return spacer + s;
    }).join("\n");
}
server.on("request", function (request, channel) {

    if (argv.silent) {
        return
    }
    ;

    console.log(t(request.requestHeader.timeStamp), request.requestHeader.requestHandle,
        request._schema.name.yellow, " ID =", channel.secureChannelId.toString().cyan);
    switch (request._schema.name) {
        case "xxModifySubscriptionRequest":
        case "xxCreateMonitoredItemsRequest":
        case "xxModifyMonitoredItemsRequest":
        case "xxRepublishRequest":
        case "xxWriteRequest":
            console.log(request.toString());
            break;
        case "xxReadRequest":
            var str = "    ";
            if (request.nodesToRead) {
                request.nodesToRead.map(function (node) {
                    str += node.nodeId.toString() + " " + node.attributeId + " " + node.indexRange;
                });
            }
            console.log(str);
            break;
        case "xxWriteRequest":
            if (request.nodesToWrite) {
                var lines = request.nodesToWrite.map(function (node) {
                    return "     " + node.nodeId.toString().green + " " + node.attributeId + " " + node.indexRange + "\n" + indent("" + node.value.toString(), 10) + "\n";
                });
                console.log(lines.join("\n"));
            }
            break;

        case "xxTranslateBrowsePathsToNodeIdsRequest":
        case "xxBrowseRequest":
        case "xxCreateSessionRequest":
        case "xxActivateSessionRequest":
        case "xxCloseSessionRequest":
        case "xxCreateSubscriptionRequest":
        case "xxSetPublishingModeRequest":
            // do special console output
            //console.log(util.inspect(request, {colors: true, depth: 10}));
            console.log(request.toString());
            break;
        case "xxPublishRequest":
            console.log(request.toString());
            break;
    }
});

process.on('SIGINT', function () {
    // only work on linux apparently
    console.error(" Received server interruption from user ".red.bold);
    console.error(" shutting down ...".red.bold);
    server.shutdown(1000, function () {
        console.error(" shutting down completed ".red.bold);
        console.error(" done ".red.bold);
        console.error("");
        process.exit(-1);
    });
});

var discovery_server_endpointUrl = "opc.tcp://" + hostname + ":4840/UADiscovery";

console.log("\nregistering server to :".yellow + discovery_server_endpointUrl);

server.registerServer(discovery_server_endpointUrl, function (err) {
    if (err) {
        // cannot register server in discovery
        console.log("     warning : cannot register server into registry server".cyan);
    } else {

        console.log("     registering server to the discovery server : done.".cyan);
    }
    console.log("");
});


server.on("newChannel", function (channel) {
    console.log("Client connected with address = ".bgYellow, channel.remoteAddress, " port = ", channel.remotePort);
});

server.on("closeChannel", function (channel) {
    console.log("Client disconnected with address = ".bgCyan, channel.remoteAddress, " port = ", channel.remotePort);
});
