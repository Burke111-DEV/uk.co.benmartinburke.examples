// Which landmark trios make up each joint. (And their full names)
const JOINTS = {
    TJ1: {
        a: 0,
        b: 1,
        c: 2,
        text: "Thumb CMC"
    }, 
    IJ1: {
        a: 0,
        b: 5,
        c: 6,
        text: "Index MCP"
    }, 
    MJ1: {
        a: 0,
        b: 9,
        c: 10,
        text: "Middle MCP"
    }, 
    RJ1: {
        a: 0,
        b: 13,
        c: 14,
        text: "Ring MCP"
    }, 
    PJ1: {
        a: 0,
        b: 17,
        c: 18,
        text: "Pinky MCP"
    }, 
    TJ2: {
        a: 1,
        b: 2,
        c: 3,
        text: "Thumb MCP"
    }, 
    IJ2: {
        a: 5,
        b: 6,
        c: 7,
        text: "Index PIP"
    }, 
    MJ2: {
        a: 9,
        b: 10,
        c: 11,
        text: "Middle PIP"
    }, 
    RJ2: {
        a: 13,
        b: 14,
        c: 15,
        text: "Ring PIP"
    }, 
    PJ2: {
        a: 17,
        b: 18,
        c: 19,
        text: "Pinky PIP"
    }, 
    TJ3: {
        a: 2,
        b: 3,
        c: 4,
        text: "Thumb DIP"
    }, 
    IJ3: {
        a: 6,
        b: 7,
        c: 8,
        text: "Index DIP"
    }, 
    MJ3: {
        a: 10,
        b: 11,
        c: 12,
        text: "Middle DIP"
    }, 
    RJ3: {
        a: 14,
        b: 15,
        c: 16,
        text: "Ring DIP"
    }, 
    PJ3: {
        a: 18,
        b: 19,
        c: 20,
        text: "Pinky DIP"
    }
}

// Running median ring buffer used as LPF.
class MedianmRingBuffer {
    constructor(size) {
        this.buffer = new Array(size);
        this.size = size;
        this.start = 0; // Pointer to the start position
        this.end = 0; // Pointer to the end position
        this.length = 0; // Number of elements currently in the buffer
        this.sortedArray = []; // Sorted array to maintain the elements in ascending order
    }
    
    enqueue(item) {
        if (this.length === this.size) {
        // Buffer is full, overwrite the oldest item
        this.removeFromSortedArray(this.buffer[this.start]);
        this.start = (this.start + 1) % this.size;
        } else {
        // Buffer has space, increase the length
        this.length++;
        }
    
        // Add the new item to the end of the buffer and update the sorted array
        this.buffer[this.end] = item;
        this.addToSortedArray(item);
        this.end = (this.end + 1) % this.size;
    }
    
    dequeue() {
        if (this.length === 0) {
        // Buffer is empty, nothing to dequeue
        return undefined;
        }
    
        // Remove and return the item from the start of the buffer and update the sorted array
        const item = this.buffer[this.start];
        this.buffer[this.start] = undefined;
        this.removeFromSortedArray(item);
        this.start = (this.start + 1) % this.size;
        this.length--;
    
        return item;
    }
    
    addToSortedArray(item) {
        let index = this.sortedArray.length;
        while (index > 0 && this.sortedArray[index - 1] > item) {
        this.sortedArray[index] = this.sortedArray[index - 1];
        index--;
        }
        this.sortedArray[index] = item;
    }
    
    removeFromSortedArray(item) {
        const index = this.sortedArray.indexOf(item);
        if (index !== -1) {
        this.sortedArray.splice(index, 1);
        }
    }
    
    getMedian() {
        if (this.length === 0) {
        // Buffer is empty, no median available
        return undefined;
        }
    
        const middleIndex = Math.floor(this.sortedArray.length / 2);
        if (this.sortedArray.length % 2 === 0) {
        // Even number of elements, average the two middle values
        return (this.sortedArray[middleIndex - 1] + this.sortedArray[middleIndex]) / 2;
        } else {
        // Odd number of elements, return the middle value
        return this.sortedArray[middleIndex];
        }
    }
}


// Translate all landmarks so that wrist is origin.
function resetLandmarksOrigin(landmarks) {
    let r_l = [];
    for(let i = 0; i< 21; i++) {
        r_l.push({
            x: landmarks[i].x-landmarks[0].x,
            y: landmarks[i].y-landmarks[0].y,
            z: landmarks[i].z-landmarks[0].z,
        });
    }
    return r_l;
}

// Calculate magnitude of vector defined between two points.
function getVectorMagnitude(A, B) {
    const vec = {
        x: B.x - A.x,
        y: B.y - A.y,
        z: B.z - A.z
    }

    return Math.sqrt(vec.x**2 + vec.y**2 + vec.z**2);
}

// Get the length of each side of a triangle defined as three XYZ points.
function getTriangleSides(points) {
    return {
        a: getVectorMagnitude(points.a, points.b),
        b: getVectorMagnitude(points.b, points.c),
        c: getVectorMagnitude(points.a, points.c)
    }
}

// Get the angle (in degrees) for corner AB in triangle ABC.
function getAngleAB(sides) {
    const numerator = sides.a * sides.a + sides.b * sides.b - sides.c * sides.c;
    const denominator = 2 * sides.a * sides.b;
    const cosAngle = numerator / denominator;
    const angleInRadians = Math.acos(cosAngle);
    const angleInDegrees = angleInRadians * (180 / Math.PI);
    return angleInDegrees;
}

// Get the angle (in degrees) for corner AB in triangle ABC. (Nearest 5 degrees; more noise filtering)
function getAngleABStrict(sides) {
    const strict_lim = 5;

    const numerator = sides.a * sides.a + sides.b * sides.b - sides.c * sides.c;
    const denominator = 2 * sides.a * sides.b;
    const cosAngle = numerator / denominator;
    const angleInRadians = Math.acos(cosAngle);
    const angleInDegrees = Math.round(Math.min(angleInRadians * (180 / Math.PI), 180)/strict_lim)*strict_lim;
    
    return angleInDegrees;
}

// Get object containing rotation angles for each joint.
function getAngles(landmarks) {
    const angles = {};
    
    for (let joint in JOINTS) {
        angles[joint] = getAngleABStrict(getTriangleSides({
            a: landmarks[JOINTS[joint].a],
            b: landmarks[JOINTS[joint].b],
            c: landmarks[JOINTS[joint].c],
        }));
    }

    return angles;
}

export default {
    JOINTS: JOINTS,
    JointsProcessor: class JointsProcessor {
        constructor(_results_callback,
                    _filter_size = 32,
                    _maxNumHands = 2,
                    _minDetectionConfidence = 0.6,
                    _minTrackingConfidence = 0.2,
                    _modelComplexity = 1,
                    ) {
            
            // MediaPipe Hands setup
            this.videoElement = document.createElement('video');

            this.hands = new Hands({locateFile: (file) => {return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;}});
            this.hands.setOptions({
                maxNumHands: _maxNumHands,
                minDetectionConfidence: _minDetectionConfidence,
                minTrackingConfidence: _minTrackingConfidence,
                modelComplexity: _modelComplexity,
            });
            this.hands.onResults(results => this.onResults(results));

            // Attach camera feed to MP Hands
            this.camera = new Camera(this.videoElement, {
                onFrame: async () => {
                  await this.hands.send({image: this.videoElement});
                },
            });
            this.camera.start();

            // Filters for each joint.
            this.filters = {
                TJ1: new MedianmRingBuffer(_filter_size),
                IJ1: new MedianmRingBuffer(_filter_size),
                MJ1: new MedianmRingBuffer(_filter_size),
                RJ1: new MedianmRingBuffer(_filter_size),
                PJ1: new MedianmRingBuffer(_filter_size),
                TJ2: new MedianmRingBuffer(_filter_size),
                IJ2: new MedianmRingBuffer(_filter_size),
                MJ2: new MedianmRingBuffer(_filter_size),
                RJ2: new MedianmRingBuffer(_filter_size),
                PJ2: new MedianmRingBuffer(_filter_size),
                TJ3: new MedianmRingBuffer(_filter_size),
                IJ3: new MedianmRingBuffer(_filter_size),
                MJ3: new MedianmRingBuffer(_filter_size),
                RJ3: new MedianmRingBuffer(_filter_size),
                PJ3: new MedianmRingBuffer(_filter_size),
            }

            this.results_callback = _results_callback;
        }

        onResults(results) {
            // Find Right-Hand (left if front-facing camera)
            if(results.multiHandedness.length == 0 || ( results.multiHandedness.length == 1 && results.multiHandedness[0].label === 'Left'))
                return;
            const I = results.multiHandedness.length == 1 ?  0 :  results.multiHandedness[0].label === 'Left' ? 1 : 0;

            // Acquire angles from landmark coordinates
            const l_an = getAngles(resetLandmarksOrigin(results.multiHandLandmarks[I]));
            
            this.results_callback(this.filterResults(l_an));
        }

        filterResults(results) {
            const filteredResults = {};

            for(let joint in JOINTS) {
                this.filters[joint].enqueue(results[joint]);
                filteredResults[joint] = Math.round(this.filters[joint].getMedian());
            }

            return filteredResults;
        }
    },
}