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
var logfile = 'OPCUAlog.txt';
var wstream = fs.createWriteStream(logfile);

function log(logType, data) {
    var time = new Date().toLocaleString();
    //     new Date().toISOString().
    // replace(/T/, ' ').      // replace T with a space
    // replace(/\..+/, '');
    wstream.write(time
        + ': [' + logType +']: ' + data + '\n');
    console.log(data);
}
function getType(typeFromCsv) {
    var theType = {
        typeName: '',
        DataType: 0,
        value: null
    };
    if (typeFromCsv.toUpperCase().indexOf('INT') >= 0) {
        theType.typeName = 'Int16';
        theType.DataType = DataType.Int16;
        theType.value = 0;
    } else if (typeFromCsv.indexOf('BOOL') >= 0 || typeFromCsv.indexOf('Boolean') >= 0 ) {
        theType.typeName = 'Boolean';
        theType.DataType = DataType.Boolean;
        theType.value = false;
    }
    else if (typeFromCsv.toUpperCase().indexOf('WORD') >= 0) {
        theType.typeName = 'Int64';
        theType.DataType = DataType.Int64;
        theType.value = 0;
    } else if (typeFromCsv.indexOf('BYTE') >= 0) {
        theType.typeName = 'Byte';
        theType.DataType = DataType.Byte;
        theType.value = 0;
    } else if (typeFromCsv.indexOf('REAL') >= 0) {
        theType.typeName = 'Double';
        theType.DataType = DataType.Double;
        theType.value = 0.0;
    } else {
        theType.typeName = 'String';
        theType.DataType = DataType.String;
        theType.value = '';
    }
    return theType;

}

function importOPCCompatiableStructure(addressSpace, parentNode) {
    var elements=[];
    var nodeId ='';
    var infos=[];
    var pathInfo = '';
    var type = '';
    var paths = [];
    var oPCUAType = {};
    fs.readFile('output.csv', 'utf8', function (err, data) {
        if (err) {
            console.error('E', err);
        }
        else {
            elements = data.split('\n');
            nodeId= 'ns=1;s=PLC1';
            elements.forEach(function (element) {
                infos= [];
                log('D','element: ' + element);

                if (element) {
                    //first info is path; second info is type
                    infos = element.split(',');
                }

                if (infos.length >= 2) {

                    pathInfo = infos[0];
                    type = infos[1];
                    paths = pathInfo.split('.');
                    oPCUAType = getType(type);
                    paths.forEach(function (path, i) {
                        parentNode = addressSpace.findNode(nodeId);
                        if(!parentNode){
                            log('W','parentNode not found! ' + nodeId);
                        }
                        nodeId += '.' + path;
                        if (addressSpace.findNode(nodeId)) {
                            log('D','find node: ' + nodeId);
                        } else {
                            log('D','not find node: ' + nodeId);
                            //create new node
                            if (i === paths.length - 1) {
                                //it is variable
                                if(parentNode) {
                                    log('D','create variable: ' + nodeId + ', parentNode: ' + parentNode.browseName);
                                    log('D','variable typename: ' + oPCUAType.typeName);
                                    addressSpace.addVariable({
                                        organizedBy: parentNode,
                                        browseName: path,
                                        nodeId: nodeId,
                                        dataType: oPCUAType.typeName,
                                        value: new Variant({dataType: oPCUAType.DataType, value: oPCUAType.value})
                                    });
                                }else {
                                    log('E','parentNode is empty ');
                                }
                                nodeId = 'ns=1;s=PLC1';
                            }
                            else {
                                log('D','try to create folder: ' + nodeId + ' ... i: ' + i);
                                try {
                                    if(parentNode){
                                        log('D','create folder: ' + nodeId +  ' ,parentNode: ' + parentNode.browseName);
                                        addressSpace.addFolder(parentNode, {
                                            nodeId: nodeId,
                                            browseName: path
                                        });
                                    }
                                    else {
                                        log('E','parentNode is empty ');
                                    }
                                }catch (ex){
                                    log('E',ex);
                                }

                            }
                        }
                    });
                }
            });
            var referenceType = addressSpace.addReferenceType({
                isAbstract: false,
                browseName: 'Element',
                inverseName: 'Element'
            });
            console.log('refereneceType id: ' + referenceType.nodeId);
            var sourceNode = addressSpace.findNode('ns=1;s=PLC1.G054M.A_1006');
            var targetNode = addressSpace.findNode('ns=1;s=PLC1.G053M.A_1007.A_1007_KFC01');
            if(referenceType && sourceNode && targetNode){
                var reference ={
                    referenceType: 'HasChild',
                    isForward : true,
                    nodeId :targetNode.nodeId
                };
                console.log('try to create reference');
                sourceNode.addReference(reference);
            }
        }

    });
}
function isInArray(input, elementNodeId) {
    var i = 0, len = input.length;
    for (; i < len; i++) {
        if (input[i] === elementNodeId) {
            return true;
        }
    }
    return false;
}
function importOPCUAStructure(addressSpace) {
    var prefix = 'ns=1;s=PLC1';
    var lines=[];
    var nodeId ='';
    var infos=[];
    var pathInfo = '';
    var type = '';
    var segments = [];
    var oPCUAType = {};
    var elements = [];
    var elementName ='';
    var index = -1;
    var elementNodeId = '';
    var parentNode = null;
    var elementNode = null;
    var categoryNode = null;
    var unitName = '';
    var unitNodeId = '';
    var unitNode = null;
    var reference = {};
    var unitToCreateElements ='';
    var sectionNodeId ='';
    var sectionNode = null;
    var lineNodeId = '';
    var lineNode = null;
    fs.readFile('PLC.csv', 'utf8', function (err, data) {
        if (err) {
            log('E', err);
        }
        else {
            lines = data.split('\n');
            nodeId= 'ns=1;s=PLC1';
            //remove header
            lines.splice(0, 1);
            log('D','lines length: ' + lines.length);
            lines.forEach(function (line) {

                infos= [];
                log('D','line: ' + line);

                if (line) {
                    //first info is path; second info is type
                    infos = line.split(',');
                }

                if (infos.length >= 2) {

                    pathInfo = infos[0];
                    type = infos[2];
                    //remove double quotes
                    pathInfo = pathInfo.substring(1, pathInfo.length-1);
                    log('D','pathInfo: ' + pathInfo);
                    segments = pathInfo.split('.');
                    oPCUAType = getType(type);
                    if(segments[0] === 'Element'){
                        elementName = segments[2];
                        index = elementName.lastIndexOf('-');
                        elementNodeId = prefix + '.Element.' + segments[1] + '.' +segments[2];
                        if(index>-1){
                            unitName = elementName.substring(0,index);
                            log('D','unit in element: ' + unitName);
                            elements[unitName] = elements[unitName] || [];
                            if(!isInArray(elements[unitName], elementNodeId)){
                                elements[unitName].push(elementNodeId);
                            }
                            log('D','Element array for unit: ' + unitName);
                            elements[unitName].forEach(function (element) {
                                log('D', 'Element nodeid: ' + element );
                            });
                            log('D','--------------------------------');
                        }

                        parentNode = addressSpace.findNode(prefix + '.Element.' + segments[1]);
                        elementNode = addressSpace.findNode(elementNodeId);
                        if(!elementNode){
                            elementNode = addressSpace.addFolder(parentNode, {
                                nodeId: elementNodeId,
                                browseName: segments[2]
                            });
                        }

                        if(elementNode){
                            elementNodeId +='.' + segments[3];
                            categoryNode = addressSpace.findNode(elementNodeId);
                            if(!categoryNode){
                                categoryNode = addressSpace.addFolder(elementNode, {
                                    nodeId: elementNodeId,
                                    browseName: segments[3]
                                });
                            }
                            log('D', 'variable name: ' + segments[4]);
                            addressSpace.addVariable({
                                organizedBy: categoryNode,
                                browseName: segments[4],
                                nodeId: elementNodeId + '.' + segments[4],
                                dataType: oPCUAType.typeName,
                                value: new Variant({dataType: oPCUAType.DataType, value: oPCUAType.value})
                            });
                        }

                    }else if(segments[0] === 'Unit'){
                        unitNodeId = prefix + '.Unit.' + segments[1] + '.' + segments[2];
                        unitName = segments[2];
                        unitNode =addressSpace.findNode(unitNodeId);
                        parentNode =addressSpace.findNode(prefix + '.Unit.' + segments[1]);
                        if(!unitNode){
                            log('D', 'Create unit node: ' + unitNodeId);
                            unitNode = addressSpace.addFolder(parentNode, {
                                nodeId: unitNodeId,
                                browseName: segments[2]
                            });
                        }

                        unitNodeId +='.' + segments[3];
                        categoryNode = addressSpace.findNode(unitNodeId);
                        if(!categoryNode){
                            categoryNode = addressSpace.addFolder(unitNode, {
                                nodeId: unitNodeId,
                                browseName: segments[3]
                            });
                        }
                        if(segments[3] === 'Elements'){
                            if(unitToCreateElements !== unitName){
                                unitToCreateElements = unitName;
                                elements[unitName].forEach(function (elementNodeId) {
                                    elementNode = addressSpace.findNode(elementNodeId);
                                    log('D', 'Be referenced element' + elementNodeId);
                                    var referenceNode = addressSpace.findNode(unitNodeId + '.Elements.' + elementNode.browseName);
                                    if(referenceNode){
                                        log('D', 'reference at source node is existed: ' + referenceNode.nodeId);
                                    }else {
                                        try{
                                            reference ={
                                                referenceType: 'HasChild',
                                                isForward : true,
                                                nodeId :elementNodeId
                                            };
                                            categoryNode.addReference(reference);
                                        }
                                        catch (ex){
                                            log('E', ex);
                                        }


                                    }

                                });
                            }

                        }
                        else {
                            addressSpace.addVariable({
                                organizedBy: categoryNode,
                                browseName: segments[4],
                                nodeId: unitNodeId + '.' + segments[4],
                                dataType: oPCUAType.typeName,
                                value: new Variant({dataType: oPCUAType.DataType, value: oPCUAType.value})
                            });
                        }

                    }else if(segments[0] === 'Section'){
                        sectionNodeId = prefix + '.Section.' + segments[1];
                        sectionNode =addressSpace.findNode(sectionNodeId);
                        parentNode =addressSpace.findNode(prefix + '.Section');
                        if(!sectionNode){
                            log('D', 'Create section node: ' + sectionNodeId);
                            sectionNode = addressSpace.addFolder(parentNode, {
                                nodeId: sectionNodeId,
                                browseName: segments[1]
                            });
                        }

                        sectionNodeId +='.' + segments[2];
                        categoryNode = addressSpace.findNode(sectionNodeId);
                        if(!categoryNode){
                            categoryNode = addressSpace.addFolder(sectionNode, {
                                nodeId: sectionNodeId,
                                browseName: segments[2]
                            });
                        }
                        if(segments[2] === 'Units'){


                        }
                        else {
                            addressSpace.addVariable({
                                organizedBy: categoryNode,
                                browseName: segments[3],
                                nodeId: sectionNodeId + '.' + segments[3],
                                dataType: oPCUAType.typeName,
                                value: new Variant({dataType: oPCUAType.DataType, value: oPCUAType.value})
                            });
                        }
                    }else if(segments[0] === 'Line'){
                        lineNodeId = prefix + '.Line.' + segments[1] + '.' + segments[2];
                        lineNode =addressSpace.findNode(lineNodeId);
                        parentNode =addressSpace.findNode(prefix + '.Line.' + segments[1]);
                        if(!lineNode){
                            log('D', 'Create line node: ' + lineNodeId);
                            lineNode = addressSpace.addFolder(parentNode, {
                                nodeId: lineNodeId,
                                browseName: segments[2]
                            });
                        }

                        lineNodeId +='.' + segments[3];
                        categoryNode = addressSpace.findNode(lineNodeId);
                        if(!categoryNode){
                            categoryNode = addressSpace.addFolder(lineNode, {
                                nodeId: lineNodeId,
                                browseName: segments[3]
                            });
                        }
                        if(segments[3] === 'Sections'){


                        }
                        else {
                            addressSpace.addVariable({
                                organizedBy: categoryNode,
                                browseName: segments[4],
                                nodeId: lineNodeId + '.' + segments[4],
                                dataType: oPCUAType.typeName,
                                value: new Variant({dataType: oPCUAType.DataType, value: oPCUAType.value})
                            });
                        }
                    }

                }
            });
        }

    });
}
server.on("post_initialize", function () {

    build_address_space_for_conformance_testing(server.engine);

    install_optional_cpu_and_memory_usage_node(server);

    var addressSpace = server.engine.addressSpace;

    var rootFolder = addressSpace.findNode("RootFolder");
    assert(rootFolder.browseName.toString() === "Root");


    //PLC
    var PLC1 = addressSpace.addFolder(rootFolder.objects, {
        nodeId: "ns=1;s=PLC1",
        browseName: "PLC1"
    });
    //System------------------------------------
    var System = addressSpace.addFolder(PLC1, {
        nodeId: "ns=1;s=PLC1.System",
        browseName: "System"
    });
    var HandShake = addressSpace.addVariable({
        organizedBy: System,
        browseName: 'HandShake',
        nodeId: "ns=1;s=PLC1.System.HandShake",
        dataType: 'Boolean',
        value: new Variant({dataType: DataType.Boolean, value: false})
    });
    var HighestCycleTime = addressSpace.addVariable({
        organizedBy: System,
        browseName: 'HighestCycleTime',
        nodeId: "ns=1;s=PLC1.System.HighestCycleTime",
        dataType: 'Int64',
        value: new Variant({dataType: DataType.Int64, value: 0})
    });
    var LiveTimePreset = addressSpace.addVariable({
        organizedBy: System,
        browseName: 'LiveTimePreset',
        nodeId: "ns=1;s=PLC1.System.LiveTimePreset",
        dataType: 'Int64',
        value: new Variant({dataType: DataType.Int64, value: 0})
    });
    var ProjectCycleTime = addressSpace.addVariable({
        organizedBy: System,
        browseName: 'ProjectCycleTime',
        nodeId: "ns=1;s=PLC1.System.ProjectCycleTime",
        dataType: 'Int64',
        value: new Variant({dataType: DataType.Int64, value: 0})
    });
    //Element----------------------------------
    var Element = addressSpace.addFolder(PLC1, {
        nodeId: "ns=1;s=PLC1.Element",
        browseName: "Element"
    });
    var BeltMonitor = addressSpace.addFolder(Element, {
        nodeId: "ns=1;s=PLC1.Element.BeltMonitor",
        browseName: "BeltMonitor"
    });
    var FilterControl = addressSpace.addFolder(Element, {
        nodeId: "ns=1;s=PLC1.Element.FilterControl",
        browseName: "FilterControl"
    });
    var HighLevel = addressSpace.addFolder(Element, {
        nodeId: "ns=1;s=PLC1.Element.HighLevel",
        browseName: "HighLevel"
    });
    var LowLevel = addressSpace.addFolder(Element, {
        nodeId: "ns=1;s=PLC1.Element.LowLevel",
        browseName: "LowLevel"
    });
    var SimpleMotor = addressSpace.addFolder(Element, {
        nodeId: "ns=1;s=PLC1.Element.SimpleMotor",
        browseName: "SimpleMotor"
    });
    var SpeedMonitor = addressSpace.addFolder(Element, {
        nodeId: "ns=1;s=PLC1.Element.SpeedMonitor",
        browseName: "SpeedMonitor"
    });
    var ValveOpenClose = addressSpace.addFolder(Element, {
        nodeId: "ns=1;s=PLC1.Element.ValveOpenClose",
        browseName: "ValveOpenClose"
    });
    //Unit---------------------------------------
    var Unit = addressSpace.addFolder(PLC1, {
        nodeId: "ns=1;s=PLC1.Unit",
        browseName: "Unit"
    });
    var LBCA = addressSpace.addFolder(Unit, {
        nodeId: "ns=1;s=PLC1.Unit.LBCA",
        browseName: "LBCA"
    });
    var LBEA = addressSpace.addFolder(Unit, {
        nodeId: "ns=1;s=PLC1.Unit.LBEA",
        browseName: "LBEA"
    });
    var MVRW = addressSpace.addFolder(Unit, {
        nodeId: "ns=1;s=PLC1.Unit.MVRW",
        browseName: "MVRW"
    });
    var Section = addressSpace.addFolder(PLC1, {
        nodeId: "ns=1;s=PLC1.Section",
        browseName: "Section"
    });
    var Line = addressSpace.addFolder(PLC1, {
        nodeId: "ns=1;s=PLC1.Line",
        browseName: "Line"
    });
    var TRANS = addressSpace.addFolder(Line, {
        nodeId: "ns=1;s=PLC1.Line.TRANS",
        browseName: "TRANS"
    });
    var PRO = addressSpace.addFolder(Line, {
        nodeId: "ns=1;s=PLC1.Line.PRO",
        browseName: "PRO"
    });
    importOPCUAStructure(addressSpace);
    //importOPCCompatiableStructure(addressSpace, PLC1);

    // //console.log('rootFolder.objects: '+rootFolder.objects);
    // //console.log('PLC1: '+PLC1);
    // //Elevator--------------------------------------------
    // //----------------------------------------------------
    // var A_1006_MXZ01 = addressSpace.addFolder(PLC1, {
    //     nodeId: "ns=1;s=PLC1.A_1006_MXZ01",
    //     browseName: "A_1006_MXZ01"
    // });
    // //Elevator commands, hardwareIO and Information
    // var A_1006_MXZ01_Information = addressSpace.addFolder(A_1006_MXZ01, {
    //     nodeId: "ns=1;s=PLC1.A_1006_MXZ01.Information",
    //     browseName: "Information"
    // });
    // var A_1006_MXZ01_HardwareIO = addressSpace.addFolder(A_1006_MXZ01, {
    //     nodeId: "ns=1;s=PLC1.A_1006_MXZ01.HardwareIO",
    //     browseName: "HardwareIO"
    // });
    // //Information of Elevator------------------------------
    // //Element state code
    // var StCode = addressSpace.addVariable({
    //     organizedBy: A_1006_MXZ01_Information,
    //     browseName: "StCode",
    //     nodeId: "ns=1;s=PLC1.A_1006_MXZ01.Information.StCode",
    //     dataType: "Int16",
    //     value: new Variant({dataType: DataType.Int16, value: 0})
    // });
    // //Last textnumber send to log
    // var OutAlarmNoLog = addressSpace.addVariable({
    //     organizedBy: A_1006_MXZ01_Information,
    //     browseName: "OutAlarmNoLog",
    //     nodeId: "ns=1;s=PLC1.A_1006_MXZ01.Information.OutAlarmNoLog",
    //     dataType: "Int16",
    //     value: new Variant({dataType: DataType.Int16, value: 0})
    // });
    // //hardware IOs of Elevator------------------------------
    // var A_1006_MXZ01_I = addressSpace.addVariable({
    //     organizedBy: A_1006_MXZ01_HardwareIO,
    //     browseName: "A_1006_MXZ01_I",
    //     nodeId: "ns=1;s=PLC1.A_1006_MXZ01.HardwareIO.A_1006_MXZ01_I",
    //     dataType: "Boolean",
    //     value: new Variant({dataType: DataType.Boolean, value: false})
    // });
    // var A_1006_MXZ01_O = addressSpace.addVariable({
    //     organizedBy: A_1006_MXZ01_HardwareIO,
    //     browseName: "A_1006_MXZ01_O",
    //     nodeId: "ns=1;s=PLC1.A_1006_MXZ01.HardwareIO.A_1006_MXZ01_O",
    //     dataType: "Boolean",
    //     value: new Variant({dataType: DataType.Boolean, value: false})
    // });
    // //Elevator speed tester---------------------------------
    // //------------------------------------------------------
    // var A_1006_BST01 = addressSpace.addFolder(PLC1, {
    //     nodeId: "ns=1;s=PLC1.A_1006_BST01",
    //     browseName: "A_1006_BST01"
    // });
    // //Elevator speed tester commands, hardwareIO and Information
    // var A_1006_BST01_Information = addressSpace.addFolder(A_1006_BST01, {
    //     nodeId: "ns=1;s=PLC1.A_1006_BST01.Information",
    //     browseName: "Information"
    // });
    // var A_1006_BST01_HardwareIO = addressSpace.addFolder(A_1006_BST01, {
    //     nodeId: "ns=1;s=PLC1.A_1006_BST01.HardwareIO",
    //     browseName: "HardwareIO"
    // });
    // //Information of Elevator------------------------------
    // //Element state code
    // var A_1006_BST01_StCode = addressSpace.addVariable({
    //     organizedBy: A_1006_BST01_Information,
    //     browseName: "StCode",
    //     nodeId: "ns=1;s=PLC1.A_1006_BST01.Information.StCode",
    //     dataType: "Int16",
    //     value: new Variant({dataType: DataType.Int16, value: 0})
    // });
    // //Last textnumber send to log
    // var A_1006_BST01_OutAlarmNoLog = addressSpace.addVariable({
    //     organizedBy: A_1006_BST01_Information,
    //     browseName: "OutAlarmNoLog",
    //     nodeId: "ns=1;s=PLC1.A_1006_BST01.Information.OutAlarmNoLog",
    //     dataType: "Int16",
    //     value: new Variant({dataType: DataType.Int16, value: 0})
    // });
    // //hardware IOs of Elevator------------------------------
    // //test speed of elevator
    // var A_1006_BST01_I = addressSpace.addVariable({
    //     organizedBy: A_1006_BST01_HardwareIO,
    //     browseName: "A_1006_BST01_I",
    //     nodeId: "ns=1;s=PLC1.A_1006_BST01.HardwareIO.A_1006_BST01_I",
    //     dataType: "Boolean",
    //     value: new Variant({dataType: DataType.Boolean, value: false})
    // });
    //
    // //BIN001
    // var BIN001 = addressSpace.addFolder(PLC1, {
    //     nodeId: "ns=1;s=PLC1.BIN001",
    //     browseName: "BIN001"
    // });
    //
    // //bin commands, hardwareIO and Information
    // var BIN001_Commands = addressSpace.addFolder(BIN001, {
    //     nodeId: "ns=1;s=PLC1.BIN001.Commands",
    //     browseName: "Commands"
    // });
    // var BIN001_HardwareIO = addressSpace.addFolder(BIN001, {
    //     nodeId: "ns=1;s=PLC1.BIN001.HardwareIO",
    //     browseName: "HardwareIO"
    // });
    // var BIN001_Information = addressSpace.addFolder(BIN001, {
    //     nodeId: "ns=1;s=PLC1.BIN001.Information",
    //     browseName: "Information"
    // });
    // var BIN001_Parameter = addressSpace.addFolder(BIN001, {
    //     nodeId: "ns=1;s=PLC1.BIN001.Parameter",
    //     browseName: "Parameter"
    // });
    // var BIN001_States = addressSpace.addFolder(BIN001, {
    //     nodeId: "ns=1;s=PLC1.BIN001.States",
    //     browseName: "States"
    // });
    // //information
    // var BIN001_ParBinNo = addressSpace.addVariable({
    //     organizedBy: BIN001_Information,
    //     browseName: "ParBinNo",
    //     nodeId: "ns=1;s=PLC1.BIN001.Information.ParBinNo",
    //     dataType: "Int16",
    //     value: new Variant({dataType: DataType.Int16, value: 0})
    // });
    // var BIN001_InReceiverCounter = addressSpace.addVariable({
    //     organizedBy: BIN001_Information,
    //     browseName: "InReceiverCounter",
    //     nodeId: "ns=1;s=PLC1.BIN001.Information.InReceiverCounter",
    //     dataType: "Byte",
    //     value: new Variant({dataType: DataType.Byte, value: 0})
    // });
    // var BIN001_OutReceiverCounter = addressSpace.addVariable({
    //     organizedBy: BIN001_Information,
    //     browseName: "OutReceiverCounter",
    //     nodeId: "ns=1;s=PLC1.BIN001.Information.OutReceiverCounter",
    //     dataType: "Byte",
    //     value: new Variant({dataType: DataType.Byte, value: 0})
    // });
    // var BIN001_InOutOverfillWeight = addressSpace.addVariable({
    //     organizedBy: BIN001_Information,
    //     browseName: "InOutOverfillWeight",
    //     nodeId: "ns=1;s=PLC1.BIN001.Information.InOutOverfillWeight",
    //     dataType: "Double",
    //     value: new Variant({dataType: DataType.Double, value: 0.0})
    // });
    // var BIN001_InOutFillingWeight = addressSpace.addVariable({
    //     organizedBy: BIN001_Information,
    //     browseName: "InOutFillingWeight",
    //     nodeId: "ns=1;s=PLC1.BIN001.Information.InOutFillingWeight",
    //     dataType: "Double",
    //     value: new Variant({dataType: DataType.Double, value: 0.0})
    // });
    // var BIN001_InFillLevel = addressSpace.addVariable({
    //     organizedBy: BIN001_Information,
    //     browseName: "InFillLevel",
    //     nodeId: "ns=1;s=PLC1.BIN001.Information.InFillLevel",
    //     dataType: "Double",
    //     value: new Variant({dataType: DataType.Double, value: 0.0})
    // });
    // var BIN001_InRestdischargeWeight = addressSpace.addVariable({
    //     organizedBy: BIN001_Information,
    //     browseName: "InRestdischargeWeight",
    //     nodeId: "ns=1;s=PLC1.BIN001.Information.InRestdischargeWeight",
    //     dataType: "Double",
    //     value: new Variant({dataType: DataType.Double, value: 0.0})
    // });
    //
    // //states
    // var BIN001_InLowLevel = addressSpace.addVariable({
    //     organizedBy: BIN001_States,
    //     browseName: "InLowLevel",
    //     nodeId: "ns=1;s=PLC1.BIN001.States.InLowLevel",
    //     dataType: "Boolean",
    //     value: new Variant({dataType: DataType.Boolean, value: false})
    // });
    // var BIN001_InFeedOffLL = addressSpace.addVariable({
    //     organizedBy: BIN001_States,
    //     browseName: "InFeedOffLL",
    //     nodeId: "ns=1;s=PLC1.BIN001.States.InFeedOffLL",
    //     dataType: "Boolean",
    //     value: new Variant({dataType: DataType.Boolean, value: false})
    // });
    // var BIN001_InHighLevel = addressSpace.addVariable({
    //     organizedBy: BIN001_States,
    //     browseName: "InHighLevel",
    //     nodeId: "ns=1;s=PLC1.BIN001.States.InHighLevel",
    //     dataType: "Boolean",
    //     value: new Variant({dataType: DataType.Boolean, value: false})
    // });
    // var BIN001_InFeedOffHL = addressSpace.addVariable({
    //     organizedBy: BIN001_States,
    //     browseName: "InFeedOffHL",
    //     nodeId: "ns=1;s=PLC1.BIN001.States.InFeedOffHL",
    //     dataType: "Boolean",
    //     value: new Variant({dataType: DataType.Boolean, value: false})
    // });
    // var BIN001_InOutEmpty = addressSpace.addVariable({
    //     organizedBy: BIN001_States,
    //     browseName: "InOutEmpty",
    //     nodeId: "ns=1;s=PLC1.BIN001.States.InOutEmpty",
    //     dataType: "Boolean",
    //     value: new Variant({dataType: DataType.Boolean, value: false})
    // });
    // var BIN001_CmdOverrideLL = addressSpace.addVariable({
    //     organizedBy: BIN001_States,
    //     browseName: "CmdOverrideLL",
    //     nodeId: "ns=1;s=PLC1.BIN001.States.CmdOverrideLL",
    //     dataType: "Boolean",
    //     value: new Variant({dataType: DataType.Boolean, value: false})
    // });
    // var BIN001_CmdOverrideHL = addressSpace.addVariable({
    //     organizedBy: BIN001_States,
    //     browseName: "CmdOverrideHL",
    //     nodeId: "ns=1;s=PLC1.BIN001.States.CmdOverrideHL",
    //     dataType: "Boolean",
    //     value: new Variant({dataType: DataType.Boolean, value: false})
    // });
    // var BIN001_CmdDischarging = addressSpace.addVariable({
    //     organizedBy: BIN001_States,
    //     browseName: "CmdDischarging",
    //     nodeId: "ns=1;s=PLC1.BIN001.States.CmdDischarging",
    //     dataType: "Boolean",
    //     value: new Variant({dataType: DataType.Boolean, value: false})
    // });
    // var BIN001_CmdFilling = addressSpace.addVariable({
    //     organizedBy: BIN001_States,
    //     browseName: "CmdFilling",
    //     nodeId: "ns=1;s=PLC1.BIN001.States.CmdFilling",
    //     dataType: "Boolean",
    //     value: new Variant({dataType: DataType.Boolean, value: false})
    // });
    // var BIN001_CmdLastReceiverActive = addressSpace.addVariable({
    //     organizedBy: BIN001_States,
    //     browseName: "CmdLastReceiverActive",
    //     nodeId: "ns=1;s=PLC1.BIN001.States.CmdLastReceiverActive",
    //     dataType: "Boolean",
    //     value: new Variant({dataType: DataType.Boolean, value: false})
    // });
    // var BIN001_CmdLastSenderActive = addressSpace.addVariable({
    //     organizedBy: BIN001_States,
    //     browseName: "CmdLastSenderActive",
    //     nodeId: "ns=1;s=PLC1.BIN001.States.CmdLastSenderActive",
    //     dataType: "Boolean",
    //     value: new Variant({dataType: DataType.Boolean, value: false})
    // });
    // var BIN001_InDPFaultLL = addressSpace.addVariable({
    //     organizedBy: BIN001_States,
    //     browseName: "InDPFaultLL",
    //     nodeId: "ns=1;s=PLC1.BIN001.States.InDPFaultLL",
    //     dataType: "Boolean",
    //     value: new Variant({dataType: DataType.Boolean, value: false})
    // });
    // var BIN001_InDPFaultHL = addressSpace.addVariable({
    //     organizedBy: BIN001_States,
    //     browseName: "InDPFaultHL",
    //     nodeId: "ns=1;s=PLC1.BIN001.States.InDPFaultHL",
    //     dataType: "Boolean",
    //     value: new Variant({dataType: DataType.Boolean, value: false})
    // });
    // var BIN001_InRefillLevel = addressSpace.addVariable({
    //     organizedBy: BIN001_States,
    //     browseName: "InRefillLevel",
    //     nodeId: "ns=1;s=PLC1.BIN001.States.InRefillLevel",
    //     dataType: "Boolean",
    //     value: new Variant({dataType: DataType.Boolean, value: false})
    // });
    //
    //
    // var BIN001_OutLowLevel = addressSpace.addVariable({
    //     organizedBy: BIN001_States,
    //     browseName: "OutLowLevel",
    //     nodeId: "ns=1;s=PLC1.BIN001.States.OutLowLevel",
    //     dataType: "Boolean",
    //     value: new Variant({dataType: DataType.Boolean, value: false})
    // });
    // var BIN001_OutHighLevel = addressSpace.addVariable({
    //     organizedBy: BIN001_States,
    //     browseName: "OutHighLevel",
    //     nodeId: "ns=1;s=PLC1.BIN001.States.OutHighLevel",
    //     dataType: "Boolean",
    //     value: new Variant({dataType: DataType.Boolean, value: false})
    // });
    // var BIN001_OutDischarging = addressSpace.addVariable({
    //     organizedBy: BIN001_States,
    //     browseName: "OutDischarging",
    //     nodeId: "ns=1;s=PLC1.BIN001.States.OutDischarging",
    //     dataType: "Boolean",
    //     value: new Variant({dataType: DataType.Boolean, value: false})
    // });
    // var BIN001_OutFilling = addressSpace.addVariable({
    //     organizedBy: BIN001_States,
    //     browseName: "OutFilling",
    //     nodeId: "ns=1;s=PLC1.BIN001.States.OutFilling",
    //     dataType: "Boolean",
    //     value: new Variant({dataType: DataType.Boolean, value: false})
    // });
    // var BIN001_OutFull = addressSpace.addVariable({
    //     organizedBy: BIN001_States,
    //     browseName: "OutFull",
    //     nodeId: "ns=1;s=PLC1.BIN001.States.OutFull",
    //     dataType: "Boolean",
    //     value: new Variant({dataType: DataType.Boolean, value: false})
    // });
    // var BIN001_OutOverrideLL = addressSpace.addVariable({
    //     organizedBy: BIN001_States,
    //     browseName: "OutOverrideLL",
    //     nodeId: "ns=1;s=PLC1.BIN001.States.OutOverrideLL",
    //     dataType: "Boolean",
    //     value: new Variant({dataType: DataType.Boolean, value: false})
    // });
    // var BIN001_OutOverrideHL = addressSpace.addVariable({
    //     organizedBy: BIN001_States,
    //     browseName: "OutOverrideHL",
    //     nodeId: "ns=1;s=PLC1.BIN001.States.OutOverrideHL",
    //     dataType: "Boolean",
    //     value: new Variant({dataType: DataType.Boolean, value: false})
    // });
    // var BIN001_OutDryFillingDone = addressSpace.addVariable({
    //     organizedBy: BIN001_States,
    //     browseName: "OutDryFillingDone",
    //     nodeId: "ns=1;s=PLC1.BIN001.States.OutDryFillingDone",
    //     dataType: "Boolean",
    //     value: new Variant({dataType: DataType.Boolean, value: false})
    // });
    // var BIN001_OutLastReceiverActive = addressSpace.addVariable({
    //     organizedBy: BIN001_States,
    //     browseName: "OutLastReceiverActive",
    //     nodeId: "ns=1;s=PLC1.BIN001.States.OutLastReceiverActive",
    //     dataType: "Boolean",
    //     value: new Variant({dataType: DataType.Boolean, value: false})
    // });
    // var BIN001_OutLastSenderActive = addressSpace.addVariable({
    //     organizedBy: BIN001_States,
    //     browseName: "OutLastSenderActive",
    //     nodeId: "ns=1;s=PLC1.BIN001.States.OutLastSenderActive",
    //     dataType: "Boolean",
    //     value: new Variant({dataType: DataType.Boolean, value: false})
    // });
    // var BIN001_VarInLowLevel = addressSpace.addVariable({
    //     organizedBy: BIN001_States,
    //     browseName: "VarInLowLevel",
    //     nodeId: "ns=1;s=PLC1.BIN001.States.VarInLowLevel",
    //     dataType: "Boolean",
    //     value: new Variant({dataType: DataType.Boolean, value: false})
    // });
    //
    // //commands
    // var BIN001_ParLL_isBelowBin = addressSpace.addVariable({
    //     organizedBy: BIN001_States,
    //     browseName: "ParLL_isBelowBin",
    //     nodeId: "ns=1;s=PLC1.BIN001.States.ParLL_isBelowBin",
    //     dataType: "Boolean",
    //     value: new Variant({dataType: DataType.Boolean, value: false})
    // });
    // //----------------------------
    //
    // //commands
    //
    //
    // //hardwareIO
    //
    //
    // //----------------------------------------------------------
    // var BIN2 = addressSpace.addFolder(PLC1, {
    //     nodeId: "ns=1;s=PLC1.BIN2",
    //     browseName: "BIN2"
    // });
    // var BIN3 = addressSpace.addFolder(PLC1, {
    //     nodeId: "ns=1;s=PLC1.BIN3",
    //     browseName: "BIN3"
    // });
    // var BIN4 = addressSpace.addFolder(PLC1, {
    //     nodeId: "ns=1;s=PLC1.BIN4",
    //     browseName: "BIN4"
    // });
    // var BIN5 = addressSpace.addFolder(PLC1, {
    //     nodeId: "ns=1;s=PLC1.BIN5",
    //     browseName: "BIN5"
    // });
    // var BIN6 = addressSpace.addFolder(PLC1, {
    //     nodeId: "ns=1;s=PLC1.BIN6",
    //     browseName: "BIN6"
    // });
    // var BIN7 = addressSpace.addFolder(PLC1, {
    //     nodeId: "ns=1;s=PLC1.BIN7",
    //     browseName: "BIN7"
    // });
    //
    //
    // //hand take
    // var HT = addressSpace.addFolder(PLC1, {
    //     nodeId: "ns=1;s=PLC1.HT",
    //     browseName: "HT"
    // });
    // //scales
    // var Scale1 = addressSpace.addFolder(PLC1, {
    //     nodeId: "ns=1;s=PLC1.Scale1",
    //     browseName: "Scale1"
    // });
    // var Scale2 = addressSpace.addFolder(PLC1, {
    //     nodeId: "ns=1;s=PLC1.Scale2",
    //     browseName: "Scale2"
    // });
    // //it's for hand take
    // var Scale3 = addressSpace.addFolder(PLC1, {
    //     nodeId: "ns=1;s=PLC1.Scale3",
    //     browseName: "Scale3"
    // });
    // //Mix1
    // var Mixer1 = addressSpace.addFolder(PLC1, {
    //     nodeId: "ns=1;s=PLC1.Mixer1",
    //     browseName: "Mixer1"
    // });
    // //packing stations
    // var PK1 = addressSpace.addFolder(PLC1, {
    //     nodeId: "ns=1;s=PLC1.PK1",
    //     browseName: "PK1"
    // });
    // var PK2 = addressSpace.addFolder(PLC1, {
    //     nodeId: "ns=1;s=PLC1.PK2",
    //     browseName: "PK2"
    // });
    //
    // //Sections
    // var Section1 = addressSpace.addFolder(PLC1, {
    //     nodeId: "ns=1;s=PLC1.Section1",
    //     browseName: "Section1"
    // });
    // var Section2 = addressSpace.addFolder(PLC1, {
    //     nodeId: "ns=1;s=PLC1.Section2",
    //     browseName: "Section2"
    // });
    // var Section3 = addressSpace.addFolder(PLC1, {
    //     nodeId: "ns=1;s=PLC1.Section3",
    //     browseName: "Section3"
    // });
    // var Section4 = addressSpace.addFolder(PLC1, {
    //     nodeId: "ns=1;s=PLC1.Section4",
    //     browseName: "Section4"
    // });
    //
    // //Lines
    // var INT1 = addressSpace.addFolder(PLC1, {
    //     nodeId: "ns=1;s=PLC1.INT1",
    //     browseName: "INT1"
    // });
    // var INT2 = addressSpace.addFolder(PLC1, {
    //     nodeId: "ns=1;s=PLC1.INT2",
    //     browseName: "INT2"
    // });
    // var MIX1 = addressSpace.addFolder(PLC1, {
    //     nodeId: "ns=1;s=PLC1.MIX1",
    //     browseName: "MIX1"
    // });



    /**
     * variation 0:
     * ------------
     *
     * Add a variable in folder using a raw Variant.
     * Use this variation when the variable has to be read or written by the OPCUA clients
     */

    //
    // setInterval(function () {
    //     var fluctuation = Math.random() * 100 - 50;
    //     variable0.setValueFromSource(new Variant({dataType: DataType.Double, value: 1000.0 + fluctuation}));
    // }, 10);
    //
    //
    // /**
    //  * variation 1:
    //  * ------------
    //  *
    //  * Add a variable in folder using a single get function which returns the up to date variable value in Variant.
    //  * The server will set the timestamps automatically for us.
    //  * Use this variation when the variable value is controlled by the getter function
    //  * Avoid using this variation if the variable has to be made writable, as the server will call the getter
    //  * function prior to returning its value upon client read requests.
    //  */
    // addressSpace.addVariable({
    //     organizedBy: PLC1,
    //     browseName: "PumpSpeed",
    //     nodeId: "ns=1;s=PumpSpeed",
    //     dataType: "Double",
    //     value: {
    //         /**
    //          * returns the  current value as a Variant
    //          * @method get
    //          * @return {Variant}
    //          */
    //         get: function () {
    //             var pump_speed = 200 + 100 * Math.sin(Date.now() / 10000);
    //             return new Variant({dataType: DataType.Double, value: pump_speed});
    //         }
    //     }
    // });
    //
    // addressSpace.addVariable({
    //     organizedBy: PLC1,
    //     browseName: "SomeDate",
    //     nodeId: "ns=1;s=SomeDate",
    //     dataType: "DateTime",
    //     value: {
    //         get: function () {
    //             return new Variant({dataType: DataType.DateTime, value: new Date(Date.UTC(2016, 9, 13, 8, 40, 0))});
    //         }
    //     }
    // });
    //
    //
    // /**
    //  * variation 2:
    //  * ------------
    //  *
    //  * Add a variable in folder. This variable gets its value and source timestamps from the provided function.
    //  * The value and source timestamps are held in a external object.
    //  * The value and source timestamps are updated on a regular basis using a timer function.
    //  */
    // var external_value_with_sourceTimestamp = new opcua.DataValue({
    //     value: new Variant({dataType: DataType.Double, value: 10.0}),
    //     sourceTimestamp: null,
    //     sourcePicoseconds: 0
    // });
    // setInterval(function () {
    //     external_value_with_sourceTimestamp.value.value = Math.random();
    //     external_value_with_sourceTimestamp.sourceTimestamp = new Date();
    // }, 1000);
    //
    // addressSpace.addVariable({
    //     organizedBy: PLC1,
    //     browseName: "Pressure",
    //     nodeId: "ns=1;s=Pressure",
    //     dataType: "Double",
    //     value: {
    //         timestamped_get: function () {
    //             return external_value_with_sourceTimestamp;
    //         }
    //     }
    // });
    //
    //
    // /**
    //  * variation 3:
    //  * ------------
    //  *
    //  * Add a variable in a folder. This variable gets its value  and source timestamps from the provided
    //  * asynchronous function.
    //  * The asynchronous function is called only when needed by the opcua Server read services and monitored item services
    //  *
    //  */
    //
    // addressSpace.addVariable({
    //     organizedBy: PLC1,
    //     browseName: "Temperature",
    //     nodeId: "ns=1;s=Temperature",
    //     dataType: "Double",
    //
    //     value: {
    //         refreshFunc: function (callback) {
    //
    //             var temperature = 20 + 10 * Math.sin(Date.now() / 10000);
    //             var value = new Variant({dataType: DataType.Double, value: temperature});
    //             var sourceTimestamp = new Date();
    //
    //             // simulate a asynchronous behaviour
    //             setTimeout(function () {
    //                 callback(null, new DataValue({value: value, sourceTimestamp: sourceTimestamp}));
    //             }, 100);
    //         }
    //     }
    // });
    //
    // // UAAnalogItem
    // // add a UAAnalogItem
    // var node = addressSpace.addAnalogDataItem({
    //
    //     organizedBy: PLC1,
    //
    //     nodeId: "ns=1;s=TemperatureAnalogItem",
    //     browseName: "TemperatureAnalogItem",
    //     definition: "(tempA -25) + tempB",
    //     valuePrecision: 0.5,
    //     engineeringUnitsRange: {low: 100, high: 200},
    //     instrumentRange: {low: -100, high: +200},
    //     engineeringUnits: opcua.standardUnits.degree_celsius,
    //     dataType: "Double",
    //     value: {
    //         get: function () {
    //             return new Variant({dataType: DataType.Double, value: Math.random() + 19.0});
    //         }
    //     }
    // });
    //
    //
    // //------------------------------------------------------------------------------
    // // Add a view
    // //------------------------------------------------------------------------------
    // var view = addressSpace.addView({
    //     organizedBy: rootFolder.views,
    //     browseName: "MyView"
    // });
    //
    // view.addReference({
    //     referenceType: "Organizes",
    //     nodeId: node.nodeId
    // });
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
    wstream.end();
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
