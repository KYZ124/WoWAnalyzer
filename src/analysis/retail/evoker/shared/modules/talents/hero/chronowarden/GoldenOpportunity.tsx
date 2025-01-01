import Analyzer, { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import Statistic from 'parser/ui/Statistic';
import STATISTIC_CATEGORY from 'parser/ui/STATISTIC_CATEGORY';
import STATISTIC_ORDER from 'parser/ui/STATISTIC_ORDER';
import { TALENTS_EVOKER } from 'common/TALENTS';
import TalentSpellText from 'parser/ui/TalentSpellText';
import SPELLS from 'common/SPELLS';
import Events, {
  ApplyBuffEvent,
  FightEndEvent,
  RefreshBuffEvent,
  RemoveBuffEvent,
} from 'parser/core/Events';
import { formatNumber } from 'common/format';
import { PRESCIENCE_BASE_DURATION_MS } from 'analysis/retail/evoker/augmentation/constants';
import { isGoldenOpportunityPrescience } from 'analysis/retail/evoker/augmentation/modules/normalizers/CastLinkNormalizer';

/**
 * Aug: Casting Prescience has a 20% chance to cause your next Prescience to last 100% longer.
 * Pres [NYI]: Casting Echo has a 20% chance to cause your next Echo to copy 100% more healing.
 */
class GoldenOpportunity extends Analyzer {
  goldenPrescienceApplyTimestamps: { [key: number]: number } = {};
  goldenPrescienceTimestampExists: { [key: number]: boolean } = {};
  totalPrescienceExtension = 0;
  constructor(options: Options) {
    super(options);
    this.active = this.selectedCombatant.hasTalent(TALENTS_EVOKER.GOLDEN_OPPORTUNITY_TALENT);

    this.addEventListener(
      Events.applybuff.by(SELECTED_PLAYER).spell(SPELLS.PRESCIENCE_BUFF),
      this.onApplyBuff,
    );
    this.addEventListener(
      Events.refreshbuff.by(SELECTED_PLAYER).spell(SPELLS.PRESCIENCE_BUFF),
      this.onRefreshBuff,
    );
    this.addEventListener(
      Events.removebuff.by(SELECTED_PLAYER).spell(SPELLS.PRESCIENCE_BUFF),
      this.onRemoveBuff,
    );
    this.addEventListener(Events.fightend, this.onFightEnd);
  }

  onApplyBuff(event: ApplyBuffEvent) {
    if (!isGoldenOpportunityPrescience(event)) {
      return;
    }
    this.onPrescienceApply(event.targetID, event.timestamp);
  }

  onRemoveBuff(event: RemoveBuffEvent) {
    this.onPrescienceRemove(event.targetID, event.timestamp);
  }

  onRefreshBuff(event: RefreshBuffEvent) {
    this.onPrescienceRemove(event.targetID, event.timestamp);
    if (!isGoldenOpportunityPrescience(event)) {
      return;
    }
    this.onPrescienceApply(event.targetID, event.timestamp);
  }

  onFightEnd(event: FightEndEvent) {
    Object.keys(this.goldenPrescienceApplyTimestamps).forEach((targetID) => {
      if (
        !this.goldenPrescienceTimestampExists[Number(targetID)] ||
        !this.goldenPrescienceApplyTimestamps[Number(targetID)]
      ) {
        return;
      }
      const prescienceDuration =
        (event.timestamp - this.goldenPrescienceApplyTimestamps[Number(targetID)]) / 1000;
      // Fight ended before the buff expired. Therefore, the extension value was not fully used.
      // Try and manually calculate it, but we don't have an exact Mastery value so this will be approximated.
      // TODO: Actually increase the base duration based on Mastery.
      const extensionValue = prescienceDuration - PRESCIENCE_BASE_DURATION_MS / 1000;
      if (extensionValue > 0) {
        this.totalPrescienceExtension += extensionValue;
      }
      this.goldenPrescienceTimestampExists[Number(targetID)] = false;
    });
  }

  onPrescienceApply(targetID: number, timestamp: number) {
    this.goldenPrescienceApplyTimestamps[targetID] = timestamp;
    this.goldenPrescienceTimestampExists[targetID] = true;
  }

  onPrescienceRemove(targetID: number, timestamp: number) {
    //TODO: Check if the buff was removed prematurely (e.g. due to death or cancelaura) and manually calculate extension value in this case.
    if (
      !this.goldenPrescienceTimestampExists[targetID] ||
      !this.goldenPrescienceApplyTimestamps[targetID]
    ) {
      return;
    }
    const prescienceDuration = (timestamp - this.goldenPrescienceApplyTimestamps[targetID]) / 1000;
    const extensionValue = prescienceDuration / 2;
    if (extensionValue > 0) {
      this.totalPrescienceExtension += extensionValue;
    }
    this.goldenPrescienceTimestampExists[targetID] = false;
  }

  statistic() {
    return (
      <Statistic
        position={STATISTIC_ORDER.CORE(5)}
        size="flexible"
        category={STATISTIC_CATEGORY.HERO_TALENTS}
      >
        <TalentSpellText talent={TALENTS_EVOKER.GOLDEN_OPPORTUNITY_TALENT}>
          <div>
            {formatNumber(this.totalPrescienceExtension)} sec
            <small> extra duration granted</small>
          </div>
        </TalentSpellText>
      </Statistic>
    );
  }
}

export default GoldenOpportunity;
