import React, {useCallback, useEffect, useMemo, useRef, useState, useLayoutEffect} from 'react';
import {Animated, Pressable, StyleSheet, Text, View} from 'react-native';
import type {GameState, MysteryDefinition, MysteryWorld, SceneWorld, WorldSet} from '@roomriddle/shared-types';
import {
  CameraController,
  MODE_POLICY,
  SceneDirector,
  actionFor,
  assetsForSet,
  diffEvents,
  dialogueFor,
  focusable,
  frameShot,
  lookShot,
  occluders,
  projectBox,
  centerOf,
  objectBounds,
  tagSide,
  focusNeighbors,
  objectViews,
  placeSet,
  trainX,
  doorsOpen,
  tweenValue,
  verbFor,
  type ObjectView,
  type PlacedNode,
} from '@roomriddle/scene';
import {theme as ds} from '@roomriddle/ui';
import {ClueCard} from '../components/ClueCard/ClueCard';
import {GameHeader} from '../components/GameHeader/GameHeader';
import {SceneActions} from '../components/SceneActions/SceneActions';
import {TVButton} from '../components/TVButton/TVButton';
import {useGame} from '../game/GameContext';
import {useSceneHub} from '../game/useSceneHub';
import type {Navigator} from '../navigation/TVNavigation';
import {useBackInterceptor} from '../navigation/useBackInterceptor';
import {px, theme} from '../theme/theme';
import {cue, worldAudio} from '../ui/cues';
import {useAudio, useAudioPlace} from '../audio/AudioContext';
import {useSettings} from '../settings/SettingsContext';
import {Feedback} from '../ui/Feedback';
import {LoadingState} from '../ui/LoadingState';
import {useReducedMotion} from '../ui/motion';
import {RRPanel} from '../ui/RRPanel';
import {WorldCaption} from './Actors';
import {assetLoader, assetRegistry} from './art';
import {Hotspot, Plane, Stage, type CameraValues} from './Stage';
import {useWorldSession} from './WorldSession';

const W = ds.worldColors;
/** Inspected objects are parked here (design px), left of the information panel. */
const INSPECT_SPOT = {x: 560, y: 440};
/**
 * Where a focused object must sit on screen (design px): clear of the header
 * + its name tag above, and of the action bar below. Focus nudges the camera
 * just enough to keep it there.
 */
const LOOK_SAFE = {top: 150, bottom: 820, left: 200, right: 1720};
/** Objects whose top is above this (on screen) show their focus tag below them, clear of the header. */
/** A focus tag (name + action) in design px, and the highest it may sit (below the HUD header). */
const TAG_BOX = {width: 360, height: 80, gap: 18};
const TAG_TOP_LIMIT = 202;

interface Inspecting {
  objectId: string;
  /** Nearer nodes faded out so they don't cover the object. */
  hidden: string[];
  fresh: boolean;
  unlocked: string | null;
}

/**
 * The 2.5D scene: the P6 world for scenes that have one.
 *
 * Game flow is exactly the P5 scene hub's (useSceneHub + SceneActions); this
 * screen adds the world: the director plays authored timelines, the camera
 * drives every depth plane, and objects in the world are how players
 * examine things. Examining sends the ordinary engine action; the world
 * reacts to GameState changes (whoever caused them), never the other way round.
 */
export const WorldScreen = ({
  navigator,
  initialFocusKey,
  world,
  scene,
}: {
  navigator: Navigator;
  initialFocusKey?: string;
  world: MysteryWorld;
  scene: SceneWorld;
}) => {
  const {mystery, state} = useGame();
  const hub = useSceneHub(navigator);
  const [ready, setReady] = useState(false);

  // Load this scene's assets (placeholders resolve at once); release them on the way out.
  useEffect(() => {
    let live = true;
    const ids = sceneAssets(world, scene);
    assetLoader.preload(ids).then(() => live && setReady(true));
    return () => {
      live = false;
      assetLoader.unload(ids);
    };
  }, [world, scene]);

  if (!hub || !state || !mystery) {
    return null;
  }
  if (!ready) {
    return (
      <View style={styles.loading}>
        <LoadingState kind="preparing" testID="world-loading" />
      </View>
    );
  }
  return <WorldView navigator={navigator} initialFocusKey={initialFocusKey} world={world} scene={scene} mystery={mystery} state={state} hub={hub} />;
};

function sceneAssets(world: MysteryWorld, scene: SceneWorld): string[] {
  const extra = [...world.characters.map(c => c.assetId)];
  if (world.train) {
    extra.push(world.train.assetId, ...Object.values(world.train.parts));
  }
  return [...new Set(scene.sets.flatMap(s => assetsForSet(s, extra)))];
}

const WorldView = ({
  navigator,
  initialFocusKey,
  world,
  scene,
  mystery,
  state,
  hub,
}: {
  navigator: Navigator;
  initialFocusKey?: string;
  world: MysteryWorld;
  scene: SceneWorld;
  mystery: MysteryDefinition;
  state: GameState;
  hub: NonNullable<ReturnType<typeof useSceneHub>>;
}) => {
  const {dispatch} = useGame();
  const session = useWorldSession();
  const reduced = useReducedMotion();
  const gameKey = `${mystery.summary.id}:${state.startedAt ?? 0}`;

  // ── The director and its camera (one per scene) ──────────────────────
  const placed = useMemo(() => new Map(scene.sets.map(s => [s.id, placeSet(s, assetRegistry)])), [scene]);
  const director = useMemo(() => {
    const now = Date.now();
    return new SceneDirector({
      world: scene,
      camera: new CameraController(),
      train: world.train,
      nodeOf: (setId, nodeId) => placed.get(setId)?.get(nodeId),
      now,
    });
  }, [scene, world, placed]);

  const [cam] = useState<CameraValues>(() => ({x: new Animated.Value(0), y: new Animated.Value(0), zoom: new Animated.Value(1)}));
  const [trainXV] = useState(() => new Animated.Value(0));
  const [doorsV] = useState(() => new Animated.Value(0));
  const [fadeV] = useState(() => new Animated.Value(0));
  const [darkV] = useState(() => new Animated.Value(0));
  const [, setVersion] = useState(0);
  const bump = useCallback(() => setVersion(v => v + 1), []);

  // ── Frame loop: runs only while something moves ──────────────────────
  const frame = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);
  const apply = useCallback(
    (now: number) => {
      const shot = director.camera.sample(now);
      cam.x.setValue(shot.x);
      cam.y.setValue(shot.y);
      cam.zoom.setValue(shot.zoom);
      const s = director.state;
      if (world.train && s.train) {
        trainXV.setValue(trainX(world.train, s.train, now));
        doorsV.setValue(doorsOpen(world.train, s.train, now));
      }
      fadeV.setValue(tweenValue(s.fade, now));
      darkV.setValue(tweenValue(s.darkness, now));
    },
    [director, cam, world.train, trainXV, doorsV, fadeV, darkV],
  );
  const busy = useCallback(
    (now: number) => {
      const s = director.state;
      const trainMoving = world.train && s.train ? now - s.train.startedAt < world.train.durations[s.train.to] + 50 : false;
      const tweening = now < s.fade.start + s.fade.duration || now < s.darkness.start + s.darkness.duration;
      return (director.playing !== null && !s.dialogue) || director.camera.isActive(now) || trainMoving || tweening || s.caption !== null || s.setChange !== null;
    },
    [director, world.train],
  );
  const tick = useCallback(() => {
    frame.current = null;
    const now = Date.now();
    const before = director.state;
    director.update(now);
    apply(now);
    if (director.state !== before) {
      bump();
    }
    if (busy(now)) {
      frame.current = requestAnimationFrame(tick);
    }
  }, [director, apply, busy, bump]);
  const kick = useCallback(() => {
    if (frame.current === null) {
      frame.current = requestAnimationFrame(tick);
    }
  }, [tick]);
  useEffect(
    () => () => {
      if (frame.current !== null) {
        cancelAnimationFrame(frame.current);
      }
    },
    [],
  );

  // Timeline moments with names (audio.cue …) go to the Phase 7 hook.
  useEffect(
    () =>
      director.subscribe(fired => {
        for (const ev of fired) {
          if (ev.type === 'custom') {
            worldAudio({name: ev.name, payload: ev.payload});
          }
        }
      }),
    [director],
  );

  // First visit plays the scene's entry cinematic; returning (from a puzzle) doesn't.
  useEffect(() => {
    const id = scene.entryTimelineId;
    const key = `${gameKey}:${id}`;
    if (id && !session.played.has(key)) {
      session.played.add(key);
      director.play(id, Date.now());
    }
    apply(Date.now());
    bump();
    kick();
  }, [director, scene, gameKey, session, apply, bump, kick]);

  // ── The world reacts to authoritative state (anyone's action) ────────
  const prevState = useRef<GameState | null>(state);
  // Hotspot focusables by object id, for explicit remote neighbours.
  const hotspotRefs = useRef(new Map<string, View>());
  const pendingLines = useRef<{id: string; characterId?: string}[]>([]);
  useEffect(() => {
    const events = diffEvents(prevState.current, state);
    prevState.current = state;
    const played = new Set([...session.played].filter(k => k.startsWith(`${gameKey}:line:`)).map(k => k.slice(`${gameKey}:line:`.length)));
    const lines = dialogueFor(events, world.dialogue, played);
    if (lines.length > 0) {
      lines.forEach(l => session.played.add(`${gameKey}:line:${l.id}`));
      // A teammate's discovery must not cut into a cinematic or a line already
      // on screen: queue it and deliver it once the stage is free.
      pendingLines.current.push(...lines);
      bump();
    }
  }, [state, director, world.dialogue, session, gameKey, bump]);
  useEffect(() => {
    if (pendingLines.current.length === 0 || director.playing !== null || director.state.dialogue) {
      return;
    }
    const lines = pendingLines.current;
    pendingLines.current = [];
    director.say(
      lines.map(l => l.id),
      lines[0]!.characterId,
      Date.now(),
      {nodeId: 'detective-spot', exitAfter: true},
    );
    bump();
  });

  const s = director.state;
  const policy = MODE_POLICY[s.mode];
  const set = scene.sets.find(x => x.id === s.setId)!;
  const setNodes = placed.get(set.id)!;
  const views = useMemo(() => objectViews(set, mystery, state), [set, mystery, state]);
  const [inspecting, setInspecting] = useState<Inspecting | null>(null);
  const [returnTo, setReturnTo] = useState<'object' | 'bar' | null>(null);
  // Bumped when inspection closes so hotspots/bar remount and preferred focus is honoured.
  const [focusEpoch, setFocusEpoch] = useState(0);
  // Second render after mount, so neighbour refs exist.
  const [, setRefsReady] = useState(0);
  useLayoutEffect(() => {
    setRefsReady(n => n + 1);
  }, [set.id, focusEpoch]);
  const lastFocus = session.lastFocus.get(`${gameKey}:${set.id}`);

  // Audio: where we are in the world (music waits through cinematics; ambience follows the set).
  const audio = useAudio();
  const {subtitles} = useSettings().settings;
  useAudioPlace({cinematic: s.mode === 'cinematic' || (s.mode === 'dialogue' && s.dialogue?.resume === 'cinematic'), setId: set.id});
  useEffect(() => () => audio.report({cinematic: false, setId: null}), [audio]);

  // Dialogue: the current line goes to the audio hook as it appears.
  const line = s.dialogue ? world.dialogue.find(l => l.id === s.dialogue!.lineIds[s.dialogue!.index]) : undefined;
  useEffect(() => {
    if (line?.audioId) {
      worldAudio({name: 'dialogue', payload: {audioId: line.audioId, lineId: line.id}});
    }
  }, [line]);

  // ── Set transitions (push / pull / depth / fade / crossfade) ─────────
  const [veil] = useState(() => new Animated.Value(0));
  const [stageScale] = useState(() => new Animated.Value(1));
  const changeKey = s.setChange ? `${s.setChange.to}@${s.setChange.start}` : null;
  useEffect(() => {
    const c = director.state.setChange;
    if (!c) {
      return;
    }
    const from = reduced ? 1 : c.transition === 'push' ? 1.22 : c.transition === 'pull' ? 0.86 : c.transition === 'depth' ? 1.1 : 1;
    const veilFrom = c.transition === 'crossfade' ? 0.6 : c.transition === 'fade' ? 1 : 0.9;
    stageScale.setValue(from);
    veil.setValue(veilFrom);
    const a = Animated.parallel([
      Animated.timing(stageScale, {toValue: 1, duration: c.duration, useNativeDriver: true}),
      Animated.timing(veil, {toValue: 0, duration: c.duration, useNativeDriver: true}),
    ]);
    a.start();
    return () => a.stop();
  }, [changeKey, director, reduced, stageScale, veil]);

  // ── Inspection ───────────────────────────────────────────────────────
  const inspectView = inspecting ? views.find(v => v.object.id === inspecting.objectId) : undefined;
  // The resting shot while investigating: the set's shot, nudged by focus.
  const lookRef = useRef<{setId: string; shot: typeof set.camera} | null>(null);
  if (lookRef.current && lookRef.current.setId !== set.id) {
    lookRef.current = null;
  }
  const lookAt = (view: ObjectView) => {
    const node = setNodes.get(view.object.nodeId);
    if (!node || s.mode !== 'investigation' || inspecting) {
      return;
    }
    const shot = lookShot(objectBounds(view.object, node), node.depth, set.camera, LOOK_SAFE);
    const prev = lookRef.current?.shot ?? set.camera;
    if (shot.x === prev.x && shot.y === prev.y && shot.zoom === prev.zoom) {
      return;
    }
    lookRef.current = {setId: set.id, shot};
    director.camera.moveTo(shot, reduced ? 0 : 520, 'standard', Date.now());
    kick();
  };
  const openInspection = (view: ObjectView) => {
    const node = setNodes.get(view.object.nodeId);
    if (!node) {
      return;
    }
    session.lastFocus.set(`${gameKey}:${set.id}`, view.object.id);
    const bounds = objectBounds(view.object, node);
    const shot = frameShot(centerOf(bounds), node.depth, view.object.inspectZoom ?? 1.6, INSPECT_SPOT);
    // Never hide the train or characters: only scenery nodes on nearer planes.
    const scenery = [...setNodes.values()].filter(n => n.layer !== 'character' && n.layer !== 'effects');
    const hidden = occluders({id: node.id, depth: node.depth, box: bounds}, scenery, shot);
    setInspecting({objectId: view.object.id, hidden, fresh: false, unlocked: null});
    audio.moment(`inspect:${view.object.id}`);
    director.setMode('inspection');
    director.camera.moveTo(shot, reduced ? 0 : 900, 'cinematic', Date.now());
    bump();
    kick();
  };
  const closeInspection = () => {
    // Return focus to the object, or to the puzzle this inspection just unlocked.
    setReturnTo(inspecting?.unlocked ? 'bar' : 'object');
    setFocusEpoch(e => e + 1);
    setInspecting(null);
    director.setMode('investigation');
    director.camera.moveTo(lookRef.current?.shot ?? set.camera, reduced ? 0 : 700, 'standard', Date.now());
    bump();
    kick();
  };
  const examine = (view: ObjectView) => {
    const action = actionFor(view);
    if (!action) {
      return;
    }
    dispatch(action, events => {
      if (events.some(e => e.type === 'clue-discovered')) {
        cue('discovery');
        director.camera.startShake(reduced ? 0 : 2, 260, Date.now());
        kick();
      }
      const unlocked = events.filter(e => e.type === 'puzzle-unlocked');
      const titles = unlocked.map(e => (e.type === 'puzzle-unlocked' ? mystery.puzzles.find(p => p.id === e.puzzleId)?.title : '')).join(', ');
      setInspecting(cur => (cur ? {...cur, fresh: events.some(e => e.type === 'clue-discovered'), unlocked: unlocked.length > 0 ? `New puzzle unlocked: ${titles}` : null} : cur));
    });
  };

  // ── Remote / Back ────────────────────────────────────────────────────
  const skip = () => {
    audio.stopVoice();
    director.skip(Date.now());
    apply(Date.now());
    bump();
    kick();
  };
  const advance = () => {
    audio.stopVoice();
    director.advanceDialogue(Date.now());
    bump();
    kick();
  };
  useBackInterceptor(() => {
    if (hub.confirmLeave) {
      hub.setConfirmLeave(false);
    } else if (s.mode === 'cinematic') {
      skip();
    } else if (s.mode === 'dialogue') {
      advance();
    } else if (s.mode === 'inspection') {
      closeInspection();
    } else {
      hub.setConfirmLeave(true);
    }
    return true;
  });

  // ── Focus ────────────────────────────────────────────────────────────
  const targets = focusable(views);
  const firstNew = targets.find(v => v.status === 'available');
  const returning = initialFocusKey !== undefined && initialFocusKey !== 'investigate';
  const hotspotFocus = returning || returnTo === 'bar' || hub.suggestedFocus === 'continue' ? undefined : lastFocus ?? firstNew?.object.id;
  // As in the P5 scene: once the scene is complete, Continue wins over wherever the player came back from.
  const barFocus = hotspotFocus === undefined ? (returning && hub.suggestedFocus !== 'continue' ? initialFocusKey : hub.suggestedFocus) : undefined;

  const showObjects = policy.focusObjects && !hub.confirmLeave;
  // Every object's on-screen box, so a focus tag never covers a neighbour.
  const screenBoxes = new Map<string, ReturnType<typeof projectBox>>();
  for (const v of targets) {
    const node = setNodes.get(v.object.nodeId);
    if (node) {
      screenBoxes.set(v.object.id, projectBox(objectBounds(v.object, node), node.depth, set.camera));
    }
  }
  const neighbors = focusNeighbors(screenBoxes);
  const hotspots = showObjects
    ? targets.map(v => {
        const node = setNodes.get(v.object.nodeId);
        const own = screenBoxes.get(v.object.id);
        if (!node || !own) {
          return null;
        }
        const others = [...screenBoxes].filter(([id]) => id !== v.object.id).map(([, b]) => b);
        const tagBelow = tagSide(own, others, TAG_BOX, TAG_TOP_LIMIT) === 'below';
        const nb = neighbors.get(v.object.id) ?? {};
        const ref = (id?: string) => (id ? hotspotRefs.current.get(id) ?? null : null);
        const next = {up: ref(nb.up), down: ref(nb.down), left: ref(nb.left), right: ref(nb.right)};
        return (
          <Plane key={`${v.object.id}-${focusEpoch}`} cam={cam} depth={node.depth}>
            <Hotspot view={v} node={node} tagBelow={tagBelow} next={next} pressRef={r => {
                if (r) {
                  hotspotRefs.current.set(v.object.id, r);
                } else {
                  hotspotRefs.current.delete(v.object.id);
                }
              }} preferredFocus={v.object.id === hotspotFocus} onFocus={() => {
                session.lastFocus.set(`${gameKey}:${set.id}`, v.object.id);
                lookAt(v);
              }} onSelect={() => openInspection(v)} />
          </Plane>
        );
      })
    : null;

  // Dialogue sits opposite the speaker on screen, so it never covers who is talking.
  const speakerSide = (characterId: string): 'left' | 'right' | 'center' => {
    const presence = s.characters[characterId];
    const node = presence && presence.state !== 'hidden' ? setNodes.get(presence.nodeId ?? 'detective-spot') : undefined;
    if (!node) {
      return 'center';
    }
    const box = projectBox({x: node.x, y: node.y, width: node.width, height: node.height}, node.depth, set.camera);
    const cx = box.x + box.width / 2;
    return cx > 1920 * 0.6 ? 'left' : cx < 1920 * 0.4 ? 'right' : 'center';
  };
  const trainMotion = s.train;
  const found = views.filter(v => v.status === 'examined').length;
  const clueObjects = views.filter(v => v.object.clueId !== undefined).length;

  return (
    <View style={styles.screen} testID={`world-${scene.sceneId}`}>
      <Animated.View style={[StyleSheet.absoluteFill, {transform: [{scale: stageScale}]}]}>
        <Stage
          world={world}
          set={set}
          placed={setNodes}
          cam={cam}
          train={trainMotion ? {x: trainXV, doors: doorsV, state: trainMotion.to} : null}
          effects={s.effects}
          characters={s.characters}
          nodeOpacity={(n: PlacedNode) => (inspecting?.hidden.includes(n.id) ? 0.12 : 1) * director.nodeVisible(n.id, n.visible, Date.now()) * n.opacity}
          reduced={reduced}
          night={<Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.night, {opacity: darkV}]} />}
          hotspots={hotspots}
        />
      </Animated.View>
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.black, {opacity: veil}]} />
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.black, {opacity: fadeV}]} testID="world-fade" />
      {s.caption && <WorldCaption key={`${s.caption.text}@${s.caption.start}`} text={s.caption.text} style={s.caption.style} />}

      {/* ── UI layer: separate from the world, P5 design language ── */}
      {policy.showHud && (
        <View pointerEvents="box-none" style={styles.header}>
          <GameHeader context={`${hub.view.scene.title} · ${found}/${clueObjects} examined`} />
        </View>
      )}

      {s.mode === 'cinematic' && (
        <View style={styles.skip}>
          <TVButton variant="action" label="Skip ▸" onPress={skip} preferredFocus testID="world-skip" />
        </View>
      )}

      {s.mode === 'dialogue' && line && (
        <DialogueBox
          key={line.id}
          speaker={world.characters.find(c => c.id === line.characterId)?.name ?? ''}
          text={subtitles || !audio.hasVoice(line.audioId) ? line.text : null}
          spoken={line.text}
          onNext={advance} aside={inspectView !== undefined} side={speakerSide(line.characterId)} />
      )}

      {/* The inspection stays up while the detective reacts to what was found. */}
      {inspectView && (s.mode === 'inspection' || s.dialogue?.resume === 'inspection') && (
        <InspectionPanel
          view={inspectView}
          inspecting={inspecting!}
          index={inspectView.clue ? state.discoveredClueIds.indexOf(inspectView.clue.id) + 1 : 0}
          actions={s.mode === 'inspection'}
          onExamine={() => examine(inspectView)}
          onBack={closeInspection}
        />
      )}

      {(s.mode === 'investigation' || s.mode === 'exploration' || hub.confirmLeave) && (
        <View pointerEvents="box-none" style={styles.bar}>
          <View style={styles.barInner}>
            <SceneActions key={focusEpoch} hub={hub} navigator={navigator} focusKey={barFocus} investigateLabel="Clue list" evidenceCount={state.discoveredClueIds.length} compact />
          </View>
        </View>
      )}
    </View>
  );
};

/** `text` null: subtitles are off and the line is heard, so only the speaker shows. */
const DialogueBox = ({speaker, text, spoken, onNext, aside, side = 'center'}: {speaker: string; text: string | null; spoken: string; onNext: () => void; aside: boolean; side?: 'left' | 'right' | 'center'}) => (
  <View style={[styles.dialogue, !aside && side === 'left' && styles.dialogueLeft, !aside && side === 'right' && styles.dialogueRight, aside && styles.dialogueAside]} testID="world-dialogue">
    <Pressable onPress={onNext} hasTVPreferredFocus accessibilityRole="button" accessibilityLabel={`${speaker}: ${spoken} Continue.`} testID="world-dialogue-next" style={styles.dialogueInner}>
      <Text style={styles.speaker}>{speaker.toUpperCase()}</Text>
      {text !== null && <Text style={[styles.line, aside && styles.lineAside]}>{text}</Text>}
      <Text style={styles.next}>OK ▸</Text>
    </Pressable>
  </View>
);

const InspectionPanel = ({
  view,
  inspecting,
  index,
  actions,
  onExamine,
  onBack,
}: {
  view: ObjectView;
  inspecting: Inspecting;
  index: number;
  actions: boolean;
  onExamine: () => void;
  onBack: () => void;
}) => {
  const available = view.status === 'available';
  return (
    <View style={styles.inspect} testID="world-inspection">
      <RRPanel variant="elevated" tab={verbFor(view.object).toUpperCase()} meta={view.status === 'examined' ? 'IN EVIDENCE' : undefined}>
        {/* The clue card carries its own title; the name alone would repeat it. */}
        {!(view.status === 'examined' && view.clue) && <Text style={styles.inspectName}>{view.object.name}</Text>}
        {view.status === 'examined' && view.clue ? (
          <ClueCard key={view.clue.id} clue={view.clue} index={index || undefined} fresh={inspecting.fresh} testID="world-clue" />
        ) : view.status === 'scenery' ? (
          (view.object.flavor ?? []).map((f, i) => (
            <Text key={i} style={styles.inspectText}>
              {f}
            </Text>
          ))
        ) : (
          <Text style={styles.inspectText}>{view.prompt}</Text>
        )}
        {inspecting.unlocked !== null && (
          <View style={styles.inspectGap} testID="world-unlocked">
            <Feedback kind="success" title="Lead unlocked" detail={inspecting.unlocked} playKey={inspecting.unlocked} />
          </View>
        )}
        <View style={[styles.inspectActions, !actions && styles.hidden]}>
          {actions && available && <TVButton variant="action" tone="primary" label={verbFor(view.object)} onPress={onExamine} preferredFocus testID="world-examine" />}
          {actions && <TVButton key={`back-${view.status}`} variant="action" label="Back" onPress={onBack} preferredFocus={!available} testID="world-inspect-back" />}
        </View>
      </RRPanel>
    </View>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: W.black,
    overflow: 'hidden',
  },
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  night: {
    backgroundColor: W.black,
  },
  black: {
    backgroundColor: W.black,
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: theme.spacing.xxl,
    paddingTop: theme.spacing.lg,
    // Same band as the action bar: the HUD stays readable over any art the camera brings up.
    backgroundColor: theme.colors.overlay,
  },
  bar: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: theme.spacing.xxl,
    paddingBottom: theme.spacing.lg,
  },
  barInner: {
    backgroundColor: theme.colors.overlay,
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xs,
    borderTopWidth: theme.borders.hairline,
    borderColor: theme.colors.border,
  },
  skip: {
    position: 'absolute',
    right: theme.spacing.xxl,
    bottom: theme.spacing.xl,
    opacity: 0.8,
  },
  dialogue: {
    position: 'absolute',
    left: px(260),
    right: px(260),
    bottom: px(90),
  },
  // Away from a speaker standing on the right / left of the screen.
  dialogueLeft: {
    left: px(96),
    right: px(720),
  },
  dialogueRight: {
    left: px(720),
    right: px(96),
  },
  // Beside the inspection panel (which holds the right column), under the object.
  dialogueAside: {
    left: px(96),
    right: px(96 + 760 + 48),
    bottom: px(64),
  },
  dialogueInner: {
    backgroundColor: theme.colors.overlay,
    borderLeftWidth: theme.borders.heavy,
    borderColor: theme.colors.accent,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.lg,
  },
  speaker: {
    ...theme.text.label,
    color: theme.colors.accentStrong,
    marginBottom: theme.spacing.xs,
  },
  line: {
    ...theme.text.h1,
    color: theme.colors.textPrimary,
  },
  // Beside an inspected object the line steps down a tier so it stays short.
  lineAside: {
    ...theme.text.h2,
  },
  next: {
    ...theme.text.mono,
    color: theme.colors.textSecondary,
    alignSelf: 'flex-end',
    marginTop: theme.spacing.sm,
  },
  inspect: {
    position: 'absolute',
    right: px(96),
    top: px(150),
    // Never past the bottom safe edge, however much the panel holds.
    maxHeight: px(1080 - 150 - 48),
    width: px(760),
    overflow: 'hidden',
  },
  inspectName: {
    ...theme.text.h1,
    color: theme.colors.textPrimary,
    marginBottom: theme.spacing.md,
  },
  inspectText: {
    ...theme.text.body,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.sm,
  },
  hidden: {
    opacity: 0,
  },
  inspectGap: {
    marginTop: theme.spacing.md,
  },
  inspectActions: {
    flexDirection: 'row',
    gap: theme.spacing.md,
    marginTop: theme.spacing.lg,
  },
});

export type {WorldSet};
