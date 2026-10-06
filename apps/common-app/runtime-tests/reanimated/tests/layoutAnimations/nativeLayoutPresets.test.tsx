import React from 'react';
import { StyleSheet, View } from 'react-native';
import type {
  BaseAnimationBuilder,
  LayoutAnimation,
} from 'react-native-reanimated';
import Animated, {
  BounceIn,
  BounceInDown,
  BounceInLeft,
  BounceInRight,
  BounceInUp,
  BounceOut,
  BounceOutDown,
  BounceOutLeft,
  BounceOutRight,
  BounceOutUp,
  CurvedTransition,
  EntryExitTransition,
  FadeIn,
  FadeInDown,
  FadeInLeft,
  FadeInRight,
  FadeInUp,
  FadeOut,
  FadeOutDown,
  FadeOutLeft,
  FadeOutRight,
  FadeOutUp,
  FadingTransition,
  FlipInEasyX,
  FlipInEasyY,
  FlipInXDown,
  FlipInXUp,
  FlipInYLeft,
  FlipInYRight,
  FlipOutEasyX,
  FlipOutEasyY,
  FlipOutXDown,
  FlipOutXUp,
  FlipOutYLeft,
  FlipOutYRight,
  JumpingTransition,
  LightSpeedInLeft,
  LightSpeedInRight,
  LightSpeedOutLeft,
  LightSpeedOutRight,
  LinearTransition,
  PinwheelIn,
  PinwheelOut,
  RollInLeft,
  RollInRight,
  RollOutLeft,
  RollOutRight,
  RotateInDownLeft,
  RotateInDownRight,
  RotateInUpLeft,
  RotateInUpRight,
  RotateOutDownLeft,
  RotateOutDownRight,
  RotateOutUpLeft,
  RotateOutUpRight,
  SequencedTransition,
  SlideInDown,
  SlideInLeft,
  SlideInRight,
  SlideInUp,
  SlideOutDown,
  SlideOutLeft,
  SlideOutRight,
  SlideOutUp,
  StretchInX,
  StretchInY,
  StretchOutX,
  StretchOutY,
  ZoomIn,
  ZoomInDown,
  ZoomInEasyDown,
  ZoomInEasyUp,
  ZoomInLeft,
  ZoomInRight,
  ZoomInRotate,
  ZoomInUp,
  ZoomOut,
  ZoomOutDown,
  ZoomOutEasyDown,
  ZoomOutEasyUp,
  ZoomOutLeft,
  ZoomOutRight,
  ZoomOutRotate,
  ZoomOutUp,
} from 'react-native-reanimated';

import {
  describe,
  expect,
  getTestComponent,
  render,
  test,
  useTestRef,
  wait,
} from '../../../ReJest/RuntimeTestsApi';
import type { TargetSample, TraceEvent } from './nativeLayoutTestKit';
import {
  BOX_REF,
  callbackOf,
  callbacks,
  FRAME_BOX_REF,
  FRAME_MS,
  frameDrivenOf,
  hasNativeLayoutStarts,
  isHostEvent,
  sample,
  summarize,
  takeTrace,
} from './nativeLayoutTestKit';

type Flow = 'entering' | 'exiting' | 'layout';
type Preset = new () => BaseAnimationBuilder & {
  build: () => (values: never) => LayoutAnimation;
};
type BoxAnimations = Pick<React.ComponentProps<typeof Animated.View>, Flow>;
type BoxFrame = { left: number; top: number; width: number; height: number };

const DURATION = 1200;
const FRACTIONS = [0.25, 0.5, 0.75];
const CELL_HEIGHT = 160;
const REST: BoxFrame = { left: 60, top: 20, width: 50, height: 50 };
const MOVED: BoxFrame = { left: 150, top: 60, width: 90, height: 70 };
// The default easing moves by no more than two times its mean speed.
const TWO_FRAMES = (2 * 2 * FRAME_MS) / DURATION;
const AT_REST = { opacity: 0.01, points: 0.5, cells: 0.005 };
const NATIVE_TIMING = 'UnsupportedTiming';

const SCALARS = ['Opacity', 'PositionX', 'PositionY', 'Width', 'Height'];
const TARGETS = [...SCALARS, 'Transform'];
type BoxSample = Record<string, TargetSample>;

/**
 * The route of each preset with its default easing: the targets of the native
 * tracks, or the failure that keeps the animation frame-driven.
 */
const ENTERING: [Preset, string][] = [
  [FadeIn, 'Opacity'],
  [FadeInRight, 'Opacity+Transform'],
  [FadeInLeft, 'Opacity+Transform'],
  [FadeInUp, 'Opacity+Transform'],
  [FadeInDown, 'Opacity+Transform'],
  [SlideInRight, 'PositionX'],
  [SlideInLeft, 'PositionX'],
  [SlideInUp, 'PositionY'],
  [SlideInDown, 'PositionY'],
  [StretchInX, 'Transform'],
  [StretchInY, 'Transform'],
  [ZoomIn, 'Transform'],
  [ZoomInRotate, 'Transform'],
  [ZoomInLeft, 'Transform'],
  [ZoomInRight, 'Transform'],
  [ZoomInUp, 'Transform'],
  [ZoomInDown, 'Transform'],
  [ZoomInEasyUp, 'Transform'],
  [ZoomInEasyDown, 'Transform'],
  [RotateInDownLeft, 'Opacity+Transform'],
  [RotateInDownRight, 'Opacity+Transform'],
  [RotateInUpLeft, 'Opacity+Transform'],
  [RotateInUpRight, 'Opacity+Transform'],
  [RollInLeft, 'Transform'],
  [RollInRight, 'Transform'],
  [PinwheelIn, 'Opacity+Transform'],
  [FlipInXUp, 'LayoutBuildFailed:EndpointMismatch'],
  [FlipInXDown, 'LayoutBuildFailed:EndpointMismatch'],
  [FlipInYLeft, 'LayoutBuildFailed:EndpointMismatch'],
  [FlipInYRight, 'LayoutBuildFailed:EndpointMismatch'],
  [FlipInEasyX, 'LayoutBuildFailed:EndpointMismatch'],
  [FlipInEasyY, 'LayoutBuildFailed:EndpointMismatch'],
  [LightSpeedInRight, 'LayoutBuildFailed:UnsupportedValue'],
  [LightSpeedInLeft, 'LayoutBuildFailed:UnsupportedValue'],
  [BounceIn, 'LayoutBuildFailed:UnsupportedTiming'],
  [BounceInDown, 'LayoutBuildFailed:UnsupportedTiming'],
  [BounceInUp, 'LayoutBuildFailed:UnsupportedTiming'],
  [BounceInLeft, 'LayoutBuildFailed:UnsupportedTiming'],
  [BounceInRight, 'LayoutBuildFailed:UnsupportedTiming'],
];

const EXITING: [Preset, string][] = [
  [FadeOut, 'Opacity'],
  [FadeOutRight, 'Opacity+Transform'],
  [FadeOutLeft, 'Opacity+Transform'],
  [FadeOutUp, 'Opacity+Transform'],
  [FadeOutDown, 'Opacity+Transform'],
  [SlideOutRight, 'PositionX'],
  [SlideOutLeft, 'PositionX'],
  [SlideOutUp, 'PositionY'],
  [SlideOutDown, 'PositionY'],
  [StretchOutX, 'Transform'],
  [StretchOutY, 'Transform'],
  [ZoomOut, 'Transform'],
  [ZoomOutRotate, 'LayoutBuildFailed:UnsupportedValue'],
  [ZoomOutLeft, 'Transform'],
  [ZoomOutRight, 'Transform'],
  [ZoomOutUp, 'Transform'],
  [ZoomOutDown, 'Transform'],
  [ZoomOutEasyUp, 'Transform'],
  [ZoomOutEasyDown, 'Transform'],
  [RotateOutDownLeft, 'Opacity+Transform'],
  [RotateOutDownRight, 'Opacity+Transform'],
  [RotateOutUpLeft, 'Opacity+Transform'],
  [RotateOutUpRight, 'Opacity+Transform'],
  [RollOutLeft, 'Transform'],
  [RollOutRight, 'Transform'],
  [PinwheelOut, 'Opacity+Transform'],
  [FlipOutXUp, 'Transform'],
  [FlipOutXDown, 'Transform'],
  [FlipOutYLeft, 'Transform'],
  [FlipOutYRight, 'Transform'],
  [FlipOutEasyX, 'Transform'],
  [FlipOutEasyY, 'Transform'],
  [LightSpeedOutRight, 'LayoutBuildFailed:UnsupportedValue'],
  [LightSpeedOutLeft, 'LayoutBuildFailed:UnsupportedValue'],
  [BounceOut, 'LayoutBuildFailed:UnsupportedTiming'],
  [BounceOutDown, 'LayoutBuildFailed:UnsupportedTiming'],
  [BounceOutUp, 'LayoutBuildFailed:UnsupportedTiming'],
  [BounceOutLeft, 'LayoutBuildFailed:UnsupportedTiming'],
  [BounceOutRight, 'LayoutBuildFailed:UnsupportedTiming'],
];

const LAYOUT: [Preset, string][] = [
  [LinearTransition, 'PositionX+PositionY+Width+Height'],
  [CurvedTransition, 'PositionX+PositionY+Width+Height'],
  [FadingTransition, 'LayoutBuildFailed:UnsupportedTiming'],
  [SequencedTransition, 'LayoutBuildFailed:UnsupportedTiming'],
  [JumpingTransition, 'LayoutBuildFailed:UnsupportedTiming'],
  [EntryExitTransition, 'LayoutBuildFailed:UnsupportedTiming'],
];

function PresetBox({
  refName,
  frame,
  animations,
}: {
  refName: string;
  frame: BoxFrame;
  animations: BoxAnimations;
}) {
  const ref = useTestRef(refName);
  return (
    <Animated.View
      ref={ref}
      {...animations}
      style={[
        localStyles.box,
        {
          marginLeft: frame.left,
          marginTop: frame.top,
          width: frame.width,
          height: frame.height,
        },
      ]}
    />
  );
}

type PairProps = {
  native: BoxAnimations;
  frame: BoxAnimations;
  isMounted: boolean;
  boxFrame: BoxFrame;
};

function PresetPair({ native, frame, isMounted, boxFrame }: PairProps) {
  const cellOf = (refName: string, animations: BoxAnimations) => (
    <View collapsable={false} style={localStyles.cell}>
      {isMounted && (
        <PresetBox refName={refName} frame={boxFrame} animations={animations} />
      )}
    </View>
  );
  return (
    <View>
      {cellOf(BOX_REF, native)}
      {cellOf(FRAME_BOX_REF, frame)}
    </View>
  );
}

/** No sample when the view left. */
async function sampleBox(tag: number): Promise<BoxSample | undefined> {
  try {
    const samples = await Promise.all(
      TARGETS.map((target) => sample(tag, target))
    );
    return Object.fromEntries(
      TARGETS.map((target, index) => [target, samples[index]])
    );
  } catch {
    return undefined;
  }
}

const rangeOf = (values: number[]) =>
  values.length > 0 ? Math.max(...values) - Math.min(...values) : 0;

/** The change of the value of the track of a scalar target. */
const travelOf = ({ members }: TargetSample) =>
  rangeOf(members[0]?.values.map(([value]) => value) ?? []);

type Matrix = number[];

const IDENTITY: Matrix = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];

function multiply(first: Matrix, second: Matrix): Matrix {
  const product = new Array<number>(16).fill(0);
  for (let row = 0; row < 4; row++) {
    for (let column = 0; column < 4; column++) {
      for (let inner = 0; inner < 4; inner++) {
        product[4 * row + column] +=
          first[4 * row + inner] * second[4 * inner + column];
      }
    }
  }
  return product;
}

function withCells(cells: Record<number, number>): Matrix {
  const matrix = [...IDENTITY];
  for (const [index, value] of Object.entries(cells)) {
    matrix[Number(index)] = value;
  }
  return matrix;
}

/** The matrix of the value of a member, in the cell order of a sample. */
const MEMBER_MATRICES: Record<string, (value: number) => Matrix> = {
  'transform.translateX': (value) => withCells({ 12: value }),
  'transform.translateY': (value) => withCells({ 13: value }),
  'transform.scale': (value) => withCells({ 0: value, 5: value, 10: value }),
  'transform.scaleX': (value) => withCells({ 0: value }),
  'transform.scaleY': (value) => withCells({ 5: value }),
  'transform.rotateZ': (angle) =>
    withCells({
      0: Math.cos(angle),
      1: Math.sin(angle),
      4: -Math.sin(angle),
      5: Math.cos(angle),
    }),
  'transform.rotateX': (angle) =>
    withCells({
      5: Math.cos(angle),
      6: Math.sin(angle),
      9: -Math.sin(angle),
      10: Math.cos(angle),
    }),
  'transform.rotateY': (angle) =>
    withCells({
      0: Math.cos(angle),
      2: -Math.sin(angle),
      8: Math.sin(angle),
      10: Math.cos(angle),
    }),
};

type Member = TargetSample['members'][number];

/** A member with no value function has a matrix that does not change. */
function memberMatrixAt({ property, values }: Member, progress: number) {
  const matrixOf = MEMBER_MATRICES[property];
  if (!matrixOf) {
    return values[0];
  }
  const start = values[0][0];
  const end = values[values.length - 1][0];
  return matrixOf(start + (end - start) * progress);
}

/**
 * The matrix of the members of a transform track at a progress of their values.
 * The screen applies the members to a point in their order. The presentation
 * layer gives the product in the other order.
 */
function trackMatrixAt(
  members: Member[],
  progress: number,
  order: 'screen' | 'presentation'
) {
  const matrices = members.map((member) => memberMatrixAt(member, progress));
  return (order === 'screen' ? matrices : [...matrices].reverse()).reduce(
    multiply,
    IDENTITY
  );
}

const TRANSLATION_CELLS = [12, 13, 14];

/** A translation of 100 pt counts as much as 1 in each other cell. */
const matrixDistance = (first: Matrix, second: Matrix) =>
  Math.max(
    ...first.map(
      (cell, index) =>
        Math.abs(cell - second[index]) /
        (TRANSLATION_CELLS.includes(index) ? 100 : 1)
    )
  );

/** The progress at which the members give the matrix that is nearest to `shown`. */
function closestProgress(
  members: Member[],
  shown: Matrix,
  order: 'screen' | 'presentation'
) {
  const distanceAt = (progress: number) =>
    matrixDistance(trackMatrixAt(members, progress, order), shown);
  const STEPS = 200;
  let best = 0;
  for (let step = 1; step <= STEPS; step++) {
    if (distanceAt(step / STEPS) < distanceAt(best)) {
      best = step / STEPS;
    }
  }
  let low = Math.max(0, best - 1 / STEPS);
  let high = Math.min(1, best + 1 / STEPS);
  for (let iteration = 0; iteration < 40; iteration++) {
    const lowThird = low + (high - low) / 3;
    const highThird = high - (high - low) / 3;
    if (distanceAt(lowThird) < distanceAt(highThird)) {
      high = highThird;
    } else {
      low = lowThird;
    }
  }
  const progress = (low + high) / 2;
  return { progress, residual: distanceAt(progress) };
}

/** The origin of the box. A size track moves the center and not the origin. */
function scalarsOf(box: BoxSample, layer: 'model' | 'presentation') {
  const valueOf = (target: string) => box[target][layer][0];
  return {
    Opacity: valueOf('Opacity'),
    PositionX: valueOf('PositionX') - valueOf('Width') / 2,
    PositionY: valueOf('PositionY') - valueOf('Height') / 2,
    Width: valueOf('Width'),
    Height: valueOf('Height'),
  } as Record<string, number>;
}

const restToleranceOf = (target: string) =>
  target === 'Opacity' ? AT_REST.opacity : AT_REST.points;

/**
 * How far the native box is from its twin, as a part of the change of each
 * target. A target with no native track must be equal in the two boxes.
 */
function differenceOf(native: BoxSample, frame: BoxSample) {
  const shown = scalarsOf(native, 'presentation');
  const twin = scalarsOf(frame, 'model');
  const differences = SCALARS.map((target) => {
    const distance = Math.abs(shown[target] - twin[target]);
    const travel = travelOf(native[target]);
    if (travel === 0) {
      expect(distance < restToleranceOf(target)).toBe(true);
      return 0;
    }
    return distance / travel;
  });

  // The first member hides the model.
  const members = native.Transform.members.slice(1);
  if (members.length === 0) {
    expect(
      matrixDistance(native.Transform.presentation, frame.Transform.model) <
        AT_REST.cells
    ).toBe(true);
    return Math.max(...differences);
  }
  const ofNative = closestProgress(
    members,
    native.Transform.presentation,
    'presentation'
  );
  const ofTwin = closestProgress(members, frame.Transform.model, 'screen');
  expect(ofNative.residual < AT_REST.cells).toBe(true);
  expect(ofTwin.residual < AT_REST.cells).toBe(true);
  return Math.max(
    ...differences,
    Math.abs(ofNative.progress - ofTwin.progress)
  );
}

/** True when each target of the box shows the value of its model. */
function isAtRest(box: BoxSample) {
  const shown = scalarsOf(box, 'presentation');
  const model = scalarsOf(box, 'model');
  return (
    SCALARS.every(
      (target) =>
        Math.abs(shown[target] - model[target]) < restToleranceOf(target)
    ) &&
    matrixDistance(box.Transform.presentation, box.Transform.model) <
      AT_REST.cells
  );
}

function isSameModel(first: BoxSample, second: BoxSample) {
  const firstModel = scalarsOf(first, 'model');
  const secondModel = scalarsOf(second, 'model');
  return (
    SCALARS.every(
      (target) =>
        Math.abs(firstModel[target] - secondModel[target]) <
        restToleranceOf(target)
    ) &&
    matrixDistance(first.Transform.model, second.Transform.model) <
      AT_REST.cells
  );
}

/** The targets of the native tracks, or the events of a start with no command. */
function routeOf(events: TraceEvent[]) {
  const hostEvents = events.filter(isHostEvent);
  const targets = hostEvents
    .filter(({ event }) => event === 'TrackStarted')
    .map(({ target }) => target);
  const isAdmitted = hostEvents.some(({ event }) => event === 'Admitted');
  return isAdmitted ? targets.join('+') : summarize(hostEvents);
}

const SCENES: Record<Flow, { before: object; after: object }> = {
  entering: {
    before: { isMounted: false, boxFrame: REST },
    after: { isMounted: true, boxFrame: REST },
  },
  exiting: {
    before: { isMounted: true, boxFrame: REST },
    after: { isMounted: false, boxFrame: REST },
  },
  layout: {
    before: { isMounted: true, boxFrame: REST },
    after: { isMounted: true, boxFrame: MOVED },
  },
};

async function play(flow: Flow, PresetClass: Preset) {
  const presetOf = (name: string) =>
    new PresetClass().duration(DURATION).withCallback(callbackOf(name));
  const pair = {
    native: { [flow]: presetOf('native') } as BoxAnimations,
    frame: { [flow]: frameDrivenOf(presetOf('frame')) } as BoxAnimations,
  };
  const { before, after } = SCENES[flow];
  const tagsOf = () => ({
    nativeTag: getTestComponent(BOX_REF).getTag(),
    frameTag: getTestComponent(FRAME_BOX_REF).getTag(),
  });

  await render(<PresetPair {...pair} {...(before as PairProps)} />);
  await wait(200);
  const tagsBefore = flow === 'entering' ? undefined : tagsOf();
  await takeTrace();
  callbacks.length = 0;
  const startMs = performance.now();
  await render(<PresetPair {...pair} {...(after as PairProps)} />);
  const { nativeTag, frameTag } = tagsBefore ?? tagsOf();

  const rows: { native: BoxSample; frame: BoxSample }[] = [];
  for (const fraction of FRACTIONS) {
    await wait(Math.max(0, startMs + fraction * DURATION - performance.now()));
    const [native, frame] = await Promise.all([
      sampleBox(nativeTag),
      sampleBox(frameTag),
    ]);
    rows.push({ native: native!, frame: frame! });
  }
  await wait(Math.max(0, startMs + DURATION + 300 - performance.now()));
  const [native, frame] = await Promise.all([
    sampleBox(nativeTag),
    sampleBox(frameTag),
  ]);
  const events = await takeTrace();
  const eventsOf = (tag: number) =>
    events.filter(
      (event) => event.tag === tag && event.event !== 'FrameUpdateMounted'
    );
  return {
    rows,
    end: { native, frame },
    route: routeOf(eventsOf(nativeTag)),
    twinRoute: routeOf(eventsOf(frameTag)),
  };
}

describe('native layout presets with their default easing', () => {
  if (!hasNativeLayoutStarts) {
    return;
  }

  const flows: [Flow, [Preset, string][]][] = [
    ['entering', ENTERING],
    ['exiting', EXITING],
    ['layout', LAYOUT],
  ];
  for (const [flow, presets] of flows) {
    for (const [PresetClass, route] of presets) {
      const isNative = !route.startsWith('Layout');
      test(`${PresetClass.name} ${isNative ? `plays natively (${route})` : `stays frame-driven (${route})`} and agrees with its frame-driven twin`, async () => {
        const played = await play(flow, PresetClass);

        expect(played.route).toBe(route);
        expect(played.twinRoute).toBe(`LayoutBuildFailed:${NATIVE_TIMING}`);
        const differences = played.rows.map(({ native, frame }) => {
          expect(native.Opacity.playbackKeys.length > 0).toBe(isNative);
          return differenceOf(native, frame);
        });
        console.log(
          `PRESET | ${flow} | ${PresetClass.name} | ${played.route} | ${differences
            .map((difference) => difference.toFixed(4))
            .join(' ')}`
        );
        expect(Math.max(...differences) < TWO_FRAMES).toBe(true);

        const { native, frame } = played.end;
        if (flow === 'exiting') {
          expect(native).toBeUndefined();
          expect(frame).toBeUndefined();
        } else {
          expect(native!.Opacity.playbackKeys.length).toBe(0);
          expect(isAtRest(native!)).toBe(true);
          expect(isSameModel(native!, frame!)).toBe(true);
        }
        expect([...callbacks].sort().join()).toBe('frame:true,native:true');
        await render(null);
      });
    }
  }
});

const localStyles = StyleSheet.create({
  cell: {
    height: CELL_HEIGHT,
  },
  box: {
    backgroundColor: 'teal',
  },
});
