import Analyzer, { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import Statistic from 'parser/ui/Statistic';
import STATISTIC_CATEGORY from 'parser/ui/STATISTIC_CATEGORY';
import STATISTIC_ORDER from 'parser/ui/STATISTIC_ORDER';
import { TALENTS_EVOKER } from 'common/TALENTS';
import TalentSpellText from 'parser/ui/TalentSpellText';
import SPELLS from 'common/SPELLS';
import Events, {
  ApplyBuffEvent,
  DamageEvent,
  FightEndEvent,
  HealEvent,
  RefreshBuffEvent,
  RemoveBuffEvent,
} from 'parser/core/Events';
import { formatNumber } from 'common/format';
import { THREAD_OF_FATE_BASE_DURATION } from 'analysis/retail/evoker/shared/constants';
import ItemHealingDone from 'parser/ui/ItemHealingDone';
import ItemDamageDone from 'parser/ui/ItemDamageDone';

/**
 * Using certain abilities with a 45 second or longer base cooldown grants 5% Intellect for 15 sec. Essence abilities extend the duration by 1 sec.
 */
class MasterOfDestiny extends Analyzer {
  threadApplyTimestamps: { [key: number]: number } = {};
  threadTimestampExists: { [key: number]: boolean } = {};
  totalThreadExtension = 0;
  totalThreadDuration = 0;
  totalThreadsApplied = 0;

  /**
   * TODO: Check if these are actually possible?
   * If not, remove.
   */
  totalDamageGained = 0;
  totalHealingGained = 0;
  constructor(options: Options) {
    super(options);
    this.active = this.selectedCombatant.hasTalent(TALENTS_EVOKER.MASTER_OF_DESTINY_TALENT);

    this.addEventListener(
      Events.applybuff.by(SELECTED_PLAYER).spell(SPELLS.THREAD_OF_FATE_BUFF),
      this.onApplyBuff,
    );
    this.addEventListener(
      /**
       * TODO: Check what happens if all eligible players have a Thread of Fate and it is reapplied by a different player.
       * Currently assumes that it removes the previous buff, then applies a new one, so refreshbuff does not need to handle the case where a different player is refreshing the buff.
       * Very unlikely case to happen in practice.
       */
      Events.refreshbuff.by(SELECTED_PLAYER).spell(SPELLS.THREAD_OF_FATE_BUFF),
      this.onRefreshBuff,
    );
    this.addEventListener(
      Events.removebuff.by(SELECTED_PLAYER).spell(SPELLS.THREAD_OF_FATE_BUFF),
      this.onRemoveBuff,
    );
    this.addEventListener(Events.fightend, this.onFightEnd);
    this.addEventListener(Events.damage.spell(SPELLS.THREAD_OF_FATE_DAMAGE), this.onDamage);
    this.addEventListener(Events.heal.spell(SPELLS.THREAD_OF_FATE_HEALING), this.onHeal);
  }

  onApplyBuff(event: ApplyBuffEvent) {
    this.onThreadApply(event.targetID, event.timestamp);
  }

  onRemoveBuff(event: RemoveBuffEvent) {
    this.onThreadRemove(event.targetID, event.timestamp);
  }

  onRefreshBuff(event: RefreshBuffEvent) {
    this.onThreadRemove(event.targetID, event.timestamp);
    this.onThreadApply(event.targetID, event.timestamp);
  }

  onFightEnd(event: FightEndEvent) {
    Object.keys(this.threadApplyTimestamps).forEach((targetID) => {
      this.onThreadRemove(Number(targetID), event.timestamp);
    });
  }

  onDamage(event: DamageEvent) {
    if (!event.sourceID || !this.threadTimestampExists[event.sourceID]) {
      return;
    }
    const currentThreadDuration =
      (event.timestamp - this.threadApplyTimestamps[event.sourceID]) / 1000;
    if (currentThreadDuration < THREAD_OF_FATE_BASE_DURATION) {
      return;
    }
    this.totalDamageGained += event.amount;
  }

  onHeal(event: HealEvent) {
    if (!event.sourceID || !this.threadTimestampExists[event.sourceID]) {
      return;
    }
    const currentThreadDuration =
      (event.timestamp - this.threadApplyTimestamps[event.sourceID]) / 1000;
    if (currentThreadDuration < THREAD_OF_FATE_BASE_DURATION) {
      return;
    }
    this.totalHealingGained += event.amount;
  }

  onThreadApply(targetID: number, timestamp: number) {
    this.threadApplyTimestamps[targetID] = timestamp;
    this.threadTimestampExists[targetID] = true;
  }

  onThreadRemove(targetID: number, timestamp: number) {
    if (!this.threadTimestampExists[targetID] || !this.threadApplyTimestamps[targetID]) {
      return;
    }
    const threadDuration = (timestamp - this.threadApplyTimestamps[targetID]) / 1000;
    this.totalThreadDuration += threadDuration;
    this.totalThreadsApplied += 1;
    const extensionValue = threadDuration - THREAD_OF_FATE_BASE_DURATION;
    if (extensionValue > 0) {
      this.totalThreadExtension += extensionValue;
    }
    this.threadTimestampExists[targetID] = false;
  }

  statistic() {
    const averageThreadDuration = this.totalThreadDuration / this.totalThreadsApplied;
    return (
      <Statistic
        position={STATISTIC_ORDER.CORE(5)}
        size="flexible"
        category={STATISTIC_CATEGORY.HERO_TALENTS}
      >
        <TalentSpellText talent={TALENTS_EVOKER.MASTER_OF_DESTINY_TALENT}>
          <div>
            {formatNumber(this.totalThreadExtension)} sec
            <small> extra duration granted</small>
            <br />
            {formatNumber(averageThreadDuration)} sec
            <small> average buff duration</small>
            <br />
            <ItemDamageDone amount={this.totalDamageGained} />
            <br />
            <ItemHealingDone amount={this.totalHealingGained} />
          </div>
        </TalentSpellText>
      </Statistic>
    );
  }
}

export default MasterOfDestiny;