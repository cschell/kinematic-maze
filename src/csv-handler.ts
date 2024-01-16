import Papa from 'papaparse';
import THREE from "three";

export class CSVUploadHandler {
    fileInput: HTMLInputElement
    parsedCSVData?: ParsedData

    constructor() {
        this.fileInput = document.getElementById('csvFileInput') as HTMLInputElement;

        this._setupCSVUploadHandler()
    }

    _setupCSVUploadHandler(): void {
        this.fileInput?.addEventListener('change', (event) => {
            const files = (event.target as HTMLInputElement).files;

            if (files && files.length > 0) {
                const file = files[0];
                console.log('File selected:', file.name);

                Papa.parse(file, {
                    header: true,
                    dynamicTyping: true,
                    complete: (results) => {
                        console.log('Parsed results:', results.data);

                        // Convert parsed CSV data into our structured format
                        this.parsedCSVData = this.parseCSVData(results.data);
                    },
                    error: (error) => {
                        console.error('Error parsing CSV:', error.message);
                    }
                });
            }
        });
    }

    parseCSVData(rawData: any[]): ParsedData {
        const processedData: ParsedData = {};

        rawData.forEach(item => {
            const timestamp = parseFloat(item.timestamp);
            if (!processedData[timestamp]) {
                processedData[timestamp] = [];
            }

            const hmd: VRDeviceObject = {
                position: new THREE.Vector3(item.hmd_x, item.hmd_y, item.hmd_z),
                rotation: new THREE.Quaternion(item.hmd_qx, item.hmd_qy, item.hmd_qz, item.hmd_qw)
            };

            const leftController: VRDeviceObject = {
                position: new THREE.Vector3(item.left_x, item.left_y, item.left_z),
                rotation: new THREE.Quaternion(item.left_qx, item.left_qy, item.left_qz, item.left_qw)
            };

            const rightController: VRDeviceObject = {
                position: new THREE.Vector3(item.right_x, item.right_y, item.right_z),
                rotation: new THREE.Quaternion(item.right_qx, item.right_qy, item.right_qz, item.right_qw)
            };

            const vrDeviceData: VRDeviceData = {
                timestamp,
                hmd,
                leftController,
                rightController
            };

            processedData[timestamp].push(vrDeviceData);
        });

        return processedData;
    }
}


export interface ParsedData {
    [key: string]: VRDeviceData[];
}

export interface VRDeviceData {
    timestamp: number;
    hmd: VRDeviceObject;
    leftController: VRDeviceObject;
    rightController: VRDeviceObject;
}

export interface VRDeviceObject {
    position: THREE.Vector3;
    rotation: THREE.Quaternion;
    mesh?: THREE.Mesh; // Optional property to store the Three.js mesh
}