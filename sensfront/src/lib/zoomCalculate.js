const zoomCalculate = (zoom) => {
    if (zoom > 21) {
        return 3000;
    } else if (zoom > 20) {
        return 2000;
    } else if (zoom > 19) {
        return 1000;
    } else if (zoom > 18) {
        return 500;
    } else if (zoom > 17) {
        return 200;
    }else if (zoom > 16) {
        return 100;
    } else if (zoom > 15) {
        return 50;
    }else {
        return 30;
    }
};

export default zoomCalculate;
