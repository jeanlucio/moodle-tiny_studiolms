// This file is part of Moodle - https://moodle.org/
//
// Moodle is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Moodle is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Moodle.  If not, see <https://www.gnu.org/licenses/>.

/**
 * Geometry of the slices of the pie and donut chart.
 *
 * Plain ES module with no core/* import, so Node can load it for the headless tests.
 *
 * @module     tiny_studiolms/blocks/chart_geometry
 * @copyright  2026 Jean Lúcio
 * @license    https://www.gnu.org/copyleft/gpl.html GNU GPL v3 or later
 */

export const SVG_SIZE = 280;
const CX = SVG_SIZE / 2;
const CY = SVG_SIZE / 2;
export const RADIUS = 118;
export const INNER_RADIUS = 56;

/** A sweep this close to a whole turn is a whole turn: its two ends are the same point. */
const FULL_TURN = 2 * Math.PI - 1e-6;

/**
 * Convert polar coordinates to a cartesian point on the circle.
 *
 * @param {number} angle Angle in radians, 0 = top.
 * @param {number} r Radius.
 * @returns {{x: number, y: number}}
 */
const polarToXY = (angle, r) => ({
    x: CX + r * Math.sin(angle),
    y: CY - r * Math.cos(angle),
});

const fixed = (point) => `${point.x.toFixed(2)} ${point.y.toFixed(2)}`;

/**
 * Returns the "d" attribute of the path of one slice.
 *
 * An SVG arc whose two ends are the same point is not drawn at all, and the only slice of a chart sweeps a
 * whole turn, so it starts and ends at the same point. That slice is drawn as two half turns instead.
 *
 * @param {number} startAngle Start angle in radians.
 * @param {number} endAngle End angle in radians.
 * @param {string} type 'pie' or 'donut'.
 * @returns {string} Path data.
 */
export const slicePathData = (startAngle, endAngle, type) => {
    const outer1 = polarToXY(startAngle, RADIUS);

    if (endAngle - startAngle >= FULL_TURN) {
        const outerHalf = polarToXY(startAngle + Math.PI, RADIUS);
        const outer = [
            `M ${fixed(outer1)}`,
            `A ${RADIUS} ${RADIUS} 0 1 1 ${fixed(outerHalf)}`,
            `A ${RADIUS} ${RADIUS} 0 1 1 ${fixed(outer1)}`,
            'Z',
        ];
        if (type !== 'donut') {
            return outer.join(' ');
        }
        // The hole runs the other way round, so the fill leaves it empty.
        const inner1 = polarToXY(startAngle, INNER_RADIUS);
        const innerHalf = polarToXY(startAngle + Math.PI, INNER_RADIUS);
        return [
            ...outer,
            `M ${fixed(inner1)}`,
            `A ${INNER_RADIUS} ${INNER_RADIUS} 0 1 0 ${fixed(innerHalf)}`,
            `A ${INNER_RADIUS} ${INNER_RADIUS} 0 1 0 ${fixed(inner1)}`,
            'Z',
        ].join(' ');
    }

    const outer2 = polarToXY(endAngle, RADIUS);
    const large = (endAngle - startAngle) > Math.PI ? 1 : 0;

    if (type === 'donut') {
        const inner1 = polarToXY(startAngle, INNER_RADIUS);
        const inner2 = polarToXY(endAngle, INNER_RADIUS);
        return [
            `M ${fixed(outer1)}`,
            `A ${RADIUS} ${RADIUS} 0 ${large} 1 ${fixed(outer2)}`,
            `L ${fixed(inner2)}`,
            `A ${INNER_RADIUS} ${INNER_RADIUS} 0 ${large} 0 ${fixed(inner1)}`,
            'Z',
        ].join(' ');
    }

    return [
        `M ${CX} ${CY}`,
        `L ${fixed(outer1)}`,
        `A ${RADIUS} ${RADIUS} 0 ${large} 1 ${fixed(outer2)}`,
        'Z',
    ].join(' ');
};
