import {Network, DataSet, Node, Edge, IdType} from "vis"
import { FormsModule, NgModel, FormControl, FormGroup } from "@angular/forms";
import {Observable} from 'rxjs/Observable';
import { Component, ViewChild, NgModule,  AfterViewInit } from "@angular/core";
import {HttpClient} from '@angular/common/http';
import {assertNotEqual} from '@angular/core/src/render3/assert';
import {assertNotNull} from '@angular/compiler/src/output/output_ast';
import {TypeInfo} from 'ts-node';
import {containerStart} from '@angular/core/src/render3/instructions';
import { filter } from 'rxjs/operators';

@Component({
  selector: "vis",
  templateUrl: "./vis.component.html",
  styleUrls: ['./vis.component.css']
})



export class visComponent {
  network;
  container;
  exportArea;
  importButton;
  exportButton;
  clusterIndex;
  clusters = [];
  lastClusterZoomLevel;
  clusterFactor;

  clickedNodeName: String;
  clickedNodeImg: String;
  searchbar;
  test;
  @ViewChild('networkDiv')networkDiv;
  @ViewChild('sidenavInfo') sidenavInfo;

  constructor(private http: HttpClient) {
    this.clusterIndex = 0;
    this.lastClusterZoomLevel = 0;
    this.clusterFactor = 0.9;
        this.searchbar = new FormGroup({

    });
  }


  ngAfterViewInit() {
    this.importNetwork();
  }

  addConnections(elem, index) {
    // need to replace this with a tree of the network, then get child direct children of the element ==> ??
    elem.connections = this.network.getConnectedNodes(index);
  }

  destroyNetwork() {
    this.network.destroy();
  }


  exportNetwork() {
    var nodes = this.objectToArray(this.network.getPositions());
    nodes.forEach(this.addConnections);
    var exportValue = JSON.stringify(nodes, undefined, 2);
    this.exportArea.value = exportValue;
    this.resizeExportArea();
  }

  importNetwork() {
    this.http.get('./assets/romanized_fix.json').subscribe(res => {
        let inputData = [];
        for (let i in res) {
          inputData.push(res[i]);
        }
        let dataSet = new DataSet();

        //function to determine zoomdepth of graph VERY fast
        function getMaxZoomLevel() {
          return inputData.reduce((max, p) => p.level > max ? p.level : max, inputData[0].level);
        };
        let maxLevel = getMaxZoomLevel();
        for (let i in res) {
          console.log(res[i].level);
          if (res[i].level < maxLevel) {
            let newClusterNode = {
              x: res[i].x,
              y: res[i].y,
              id: 'ring' + res[i].id,
              parent: 'ring' + (res[i].parent),
              level: res[i].level,
              group: 'myGroup'
            };
            inputData.push(newClusterNode);
          }
        }

        inputData.forEach((elem, index, array) => {
          dataSet.add({id: elem.id, x: elem.x, y: elem.y, parent: elem.parent, fixed: true, physics: false, shape: elem.shape, image: elem.img, label: elem.label, group: elem.group, level: elem.level});
        });
        // }
        // let masterCluster = {
        //   x: res[0].x,
        //   y: res[0].y,
        //   id: 99,
        //   level: maxLevel,
        //   //parent: 0,
        //   group: 'xxx'
        // };
        // inputData.push(masterCluster);

        //console.log(inputData)
        //let dataSet = new this.network.DataSet();

        var data = {
          nodes: dataSet,//this.getNodeData(inputData), => making node-data dynamical
          edges: this.getEdgeData(inputData)
        };

        var options = {
          nodes: {
            fixed: {
              y: true,
              x: true
            }
          },
          groups: {
            myGroup: {
              shape: 'dot',
              size: 250,
              color:{background:'transparent', border: "#f1eec1"},
              borderWidth: 10
            },
            xxx: {
              shape: 'dot',
              size: 760,
              color:{background:'transparent', border: "#dbd7d2"}, borderWidth: 10
            }
          },
          width: (window.innerWidth) + 'px',
          height: (window.innerHeight) + 'px'
        };

        this.network = new Network(this.networkDiv.nativeElement, data, options);
        // let imageb = new Image();
        // imageb.src = '../../assets/images/HINTERGRUND.png';
        // this.network.on("beforeDrawing", function(ctx) {
        //   ctx.drawImage(imageb, -700, -600);
        // });
        // set the first initial zoom level
        this.network.once('initRedraw', () => {
          if (this.lastClusterZoomLevel === 0) {
            this.lastClusterZoomLevel = this.network.getScale();
          }
        });

        // for (let level = maxLevel; level > 0; level--) {
        //   this.clusterByCid(level);
        // }
        console.log(this.network.body);
        let zoomlevel = maxLevel;//getMaxZoomLevel(); //setting intial value for zoomlevel at 0

        // we use the zoom event for our clustering
        this.network.on('zoom', (params) => {
          if (params.direction === '-' && zoomlevel > 0) {
            //if (params.scale < this.lastClusterZoomLevel * this.clusterFactor) {
              this.clusterByCid(zoomlevel);
              if (this.network.body.nodes['master'] !== undefined) {
                dataSet.remove('master');
              }
              if (zoomlevel !== 0) {
                zoomlevel -= 1;
              }
              // if (this.lastClusterZoomLevel > 0.7 || this.lastClusterZoomLevel < 0.5) {
              //   this.lastClusterZoomLevel = 0.75;
              // }
              // //console.log(zoomlevel);
              // this.lastClusterZoomLevel = params.scale;
            //}
            //only trigger open cluster if there is a cluster to open
          } else if (params.direction === '+' && zoomlevel < maxLevel) {  //&& this.network.body.nodes['-1'] !== undefined
            // console.log('scale: ' + params.scale);
            // console.log('zoomlevel: ' + (this.lastClusterZoomLevel * this.clusterFactor));
            //if (params.scale  >= this.lastClusterZoomLevel * this.clusterFactor) {
              for (let cluster in this.network.body.nodes) {
                  if (this.network.body.nodes[cluster].isCluster === true && this.network.body.nodes[cluster].options.level === zoomlevel) {

                    this.network.openCluster(this.network.body.nodes[cluster].id);
                    if (this.network.body.nodes['master'] === undefined) {
                      dataSet.add({id: 'master', x: 0, y: 0, group: 'xxx'});
                    }
                  }
                }
             // }
              zoomlevel += 1;
              //console.log(zoomlevel);
              //this.lastClusterZoomLevel = params.scale;

          }
        });
        // This needs to go as it colides with sidenav
        // collapse on double click
        // this.network.on('doubleClick', (params) => {
        //   this.network.openCluster('abc');
        // });

        // show sidenav on single click
        this.network.on('click', (params) => {
          if (params.nodes.length > 0) {
            var clickedId = params.nodes[0];
            console.log(clickedId);
            console.log(this.network.body.nodes[clickedId].options.level);
            // var inputData = this.test;//JSON.parse(inputValue) => res to show sidenav again   need to find correct type cast
            // var clickedNode = inputData.filter(
            //   function(inputData) { return inputData['id'] === clickedId;
            //   });
            this.clickedNodeName = this.network.body.nodes[clickedId].options.label;//clickedNode[0].label;
            this.clickedNodeImg = this.network.body.nodes[clickedId].options.image;//clickedNode[0].img;
            //
            this.sidenavInfo.toggle();
          }
        });
      },
      err => {
        console.error('Error while reading data from server: ');
        console.error(err);
      });
    //this.resizeExportArea();
  }

  getNodeData(data) {
    var networkNodes = [];
    data.forEach((elem, index, array) => {
      networkNodes.push({id: elem.id, x: elem.x, y: elem.y, parent: elem.parent, fixed: true, physics: false, shape: elem.shape, image: elem.img, label: elem.label, group: elem.group, level: elem.level});
    });
    return new DataSet(networkNodes);
  }

  getNodeById(data, id) {
    for (var n = 0; n < data.length; n++) {
      if (data[n].id == id) {  // double equals since id can be numeric or string
        return data[n];
      }
    };

    //throw 'Can not find id \'' + id + '\' in data';
  }

  getEdgeData(data) {
    var networkEdges = [];
    data.forEach((node) => {
      if (node.connections !== undefined) {
        // add the connection
        node.connections.forEach((connId, cIndex, conns) => {
          networkEdges.push({from: node.id, to: connId});
          if (this.getNodeById(data, connId) !== undefined) {
            //console.log(this.getNodeById(data, connId));
            let cNode = this.getNodeById(data, connId);
            var elementConnections = cNode.connections;
            // remove the connection from the other node to prevent duplicate connections
            var duplicateIndex = elementConnections.findIndex(function (connection) {
              return connection == node.id; // double equals since id can be numeric or string
            });

            if (duplicateIndex != -1) {
              elementConnections.splice(duplicateIndex, 1);
            }
            ;
          }
        });
      }
    });

    return new DataSet(networkEdges);
  }

  objectToArray(obj) {
    return Object.keys(obj).map(function (key) {
      obj[key].id = key;
      return obj[key];
    });
  }

  resizeExportArea() {
    this.exportArea.style.height = (1 + this.exportArea.scrollHeight) + "px";
  }

  clusterByCid(zoomLevel) {  //zoomlevel probably obsolete as the level can be take from the visible node indices

    //this.network.setData(data);
    //this needs to go into vis.js.clusterByID.
    //clusterByList function needs to be redone in the style of cluster()
    //options need to be set individually for each cluster
    // var clusterOptionsByData = {
    //   joinCondition:function(nodeOptions) {
    //     return nodeOptions.parent == 7;
    //   },
    //   //clusterNodeProperties: {id:'abc', borderWidth:1, shape:'circularImage', label: 'Existenzgründung', image:'http://www.lektorat.de/images/Existenzgruendung-Medienber.jpg'}
    // };
    //this.network.cluster(clusterOptionsByData);
    //only cluster nodes below current zoomlevel
    // let toCluster = [];
    // for (let n in res) {
    //   if (res[n]['level'] >= zoomLevel) {
    //     toCluster.push(res[n]);
    //   }
    // }

    //var updateData =
      this.network.clusterByID(zoomLevel); //, clusterOptionsByData options are now dynamically created inside of visjs
    console.log(this.network.body);

    //return updateData;
  }

  //new function cluster rings takes node pos and checks for children


}
