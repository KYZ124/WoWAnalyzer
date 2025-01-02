import Analyzer, { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import Statistic from 'parser/ui/Statistic';
import STATISTIC_CATEGORY from 'parser/ui/STATISTIC_CATEGORY';
import STATISTIC_ORDER from 'parser/ui/STATISTIC_ORDER';
import { TALENTS_EVOKER } from 'common/TALENTS';
import TalentSpellText from 'parser/ui/TalentSpellText';
import SPELLS from 'common/SPELLS';
import Events, { ApplyBuffEvent, CastEvent, RemoveBuffEvent } from 'parser/core/Events';
import { InformationIcon, WarningIcon } from 'interface/icons';
import { TIME_SPIRAL_BASE_DURATION } from '../../constants';
import {
  TIMEWALKER_BASE_EXTENSION,
  TIMEWALKER_EXTENSION_MULTIPLIER,
} from 'analysis/retail/evoker/augmentation/constants';
import StatTracker from 'parser/shared/modules/StatTracker';
import SPECS from 'game/SPECS';
//import { hasTimeSpiralCastEvent } from '../normalizers/MobilityCastLinkNormalizer';
/**
 * Grants all players in the group a buff that grants them 1 free cast of their movement ability within 10 sec.
 * Aug: Available duration increased by Mastery.
 */
class TimeSpiral extends Analyzer {
  static dependencies = {
    stats: StatTracker,
  };
  protected stats!: StatTracker;
  timeSpiralApplyTimestamps: { [key: number]: number } = {};
  timeSpiralTimestampExists: { [key: number]: boolean } = {};
  timeSpiralDuration: { [key: number]: number } = {};
  buffsApplied = 0;
  buffsUsed = 0;
  personalBuffsApplied = 0;
  personalBuffsUsed = 0;
  constructor(options: Options) {
    super(options);
    const timeSpiralBuffs = [
      SPELLS.TIME_SPIRAL_DEATH_KNIGHT_BUFF,
      SPELLS.TIME_SPIRAL_DEMON_HUNTER_BUFF,
      SPELLS.TIME_SPIRAL_DRUID_BUFF,
      SPELLS.TIME_SPIRAL_EVOKER_BUFF,
      SPELLS.TIME_SPIRAL_HUNTER_BUFF,
      SPELLS.TIME_SPIRAL_HUNTER_BUFF,
      SPELLS.TIME_SPIRAL_MAGE_BUFF,
      SPELLS.TIME_SPIRAL_MONK_BUFF,
      SPELLS.TIME_SPIRAL_PALADIN_BUFF,
      SPELLS.TIME_SPIRAL_PRIEST_BUFF,
      SPELLS.TIME_SPIRAL_ROGUE_BUFF,
      SPELLS.TIME_SPIRAL_SHAMAN_BUFF,
      SPELLS.TIME_SPIRAL_WARLOCK_BUFF,
      SPELLS.TIME_SPIRAL_WARRIOR_BUFF,
    ];
    this.active = this.selectedCombatant.hasTalent(TALENTS_EVOKER.TIME_SPIRAL_TALENT);

    this.addEventListener(Events.cast.by(SELECTED_PLAYER).spell(SPELLS.HOVER), this.onHoverCast);

    this.addEventListener(
      Events.applybuff.by(SELECTED_PLAYER).spell(timeSpiralBuffs),
      this.onApplyBuff,
    );

    this.addEventListener(
      Events.removebuff.by(SELECTED_PLAYER).spell(timeSpiralBuffs),
      this.onRemoveBuff,
    );

    //TODO: Check what happens if another player refreshes Time Spiral.
    //Currently, refresh isn't implemented due to the high unlikelyhood of the player refreshing their own Time Spiral.
  }

  onHoverCast(event: CastEvent) {}

  onApplyBuff(event: ApplyBuffEvent) {
    //TODO: Fix this, currently it always just returns false.
    //if (!hasTimeSpiralCastEvent(event)) {
    //return;
    //}
    this.buffsApplied += 1;
    this.timeSpiralApplyTimestamps[event.targetID] = event.timestamp;
    this.timeSpiralTimestampExists[event.targetID] = true;
    this.timeSpiralDuration[event.targetID] = this.calculateTimeSpiralBuffDuration();
  }

  onRemoveBuff(event: RemoveBuffEvent) {
    if (!this.timeSpiralTimestampExists[event.targetID]) {
      //Can occur if Time Spiral was precast, but we have no way of knowing the buff duration in this case.
      return;
    }
    // 900 (0.9 * 1000) is used to account for variations in timestamp.
    if (
      event.timestamp <
      this.timeSpiralApplyTimestamps[event.targetID] + this.timeSpiralDuration[event.targetID] * 900
    ) {
      // This can also be triggered by the player dying or cancelling the buff, but the former would require querying to check, and the latter is unlikely.
      this.buffsUsed += 1;
    }
    this.timeSpiralTimestampExists[event.targetID] = false;
  }

  calculateTimeSpiralBuffDuration() {
    if (this.selectedCombatant.spec !== SPECS.AUGMENTATION_EVOKER) {
      return TIME_SPIRAL_BASE_DURATION;
    } else {
      return (
        TIME_SPIRAL_BASE_DURATION *
        (1 +
          TIMEWALKER_BASE_EXTENSION +
          this.stats.currentMasteryPercentage * TIMEWALKER_EXTENSION_MULTIPLIER)
      );
    }
  }

  statistic() {
    let buffsWasted = this.buffsApplied - this.buffsUsed;
    if (buffsWasted < 0) {
      buffsWasted = 0;
    }
    return (
      <Statistic
        position={STATISTIC_ORDER.OPTIONAL(13)}
        size="flexible"
        category={STATISTIC_CATEGORY.TALENTS}
      >
        <TalentSpellText talent={TALENTS_EVOKER.TIME_SPIRAL_TALENT}>
          <div>
            <InformationIcon /> {this.buffsUsed}
            <small> buffs used</small>
            <br />
            <WarningIcon /> {buffsWasted}
            <small> buffs unused</small>
          </div>
        </TalentSpellText>
      </Statistic>
    );
  }
}

export default TimeSpiral;
