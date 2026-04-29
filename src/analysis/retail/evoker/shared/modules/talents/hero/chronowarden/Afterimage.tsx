import Analyzer, { Options, SELECTED_PLAYER } from 'parser/core/Analyzer';
import Events, { EmpowerEndEvent } from 'parser/core/Events';
import ItemDamageDone from 'parser/ui/ItemDamageDone';
import Statistic from 'parser/ui/Statistic';
import STATISTIC_CATEGORY from 'parser/ui/STATISTIC_CATEGORY';
import STATISTIC_ORDER from 'parser/ui/STATISTIC_ORDER';
import TalentSpellText from 'parser/ui/TalentSpellText';
import SPELLS from 'common/SPELLS';
import TALENTS from 'common/TALENTS/evoker';
import {
  getChronoFlameDamageLink,
  getAfterimageEventsFromEmpowerEnd,
} from '../../../normalizers/ChronowardenCastLinkNormalizer';
import {
  getGeneratedEBEvents,
  getWastedEBEvents,
} from '../../../normalizers/EssenceBurstCastLinkNormalizer';
import { InformationIcon } from 'interface/icons';
import { SpellLink } from 'interface';
import Soup from 'interface/icons/Soup';

/**
 * Empower spells fire a Chrono Flame at up to 3 targets struck.
 * Healing empowers are not yet implemented.
 */
class Afterimage extends Analyzer {
  afterimageDamage = 0;
  generatedEBs = 0;
  wastedEBs = 0;
  maxEB = this.selectedCombatant.hasTalent(TALENTS.ESSENCE_ATTUNEMENT_TALENT) ? 2 : 1;

  constructor(options: Options) {
    super(options);
    this.active = this.selectedCombatant.hasTalent(TALENTS.CHRONAL_DYNAMO_TALENT);
    this.addEventListener(
      Events.empowerEnd
        .by(SELECTED_PLAYER)
        .spell([
          TALENTS.UPHEAVAL_TALENT,
          SPELLS.UPHEAVAL_FONT,
          SPELLS.FIRE_BREATH,
          SPELLS.FIRE_BREATH_FONT,
        ]),
      this.onEmpowerEnd,
    );
  }

  onEmpowerEnd(event: EmpowerEndEvent) {
    const afterimageEvents = getAfterimageEventsFromEmpowerEnd(event);
    if (afterimageEvents.length === 0) {
      return;
    }
    let empowerEBs = 0;
    let empowerEBsWasted = 0;
    afterimageEvents.forEach((event) => {
      this.afterimageDamage += event.amount;
      this.afterimageDamage += getChronoFlameDamageLink(event)?.amount ?? 0;
      empowerEBs += getGeneratedEBEvents(event).length;
      empowerEBsWasted += getWastedEBEvents(event).length;
    });
    const totalEBs = empowerEBs + empowerEBsWasted;
    // If more EBs were generated than the max, don't include the excess as wasted
    if (totalEBs > this.maxEB) {
      this.wastedEBs -= totalEBs - this.maxEB;
      // Shouldn't happen, but just in case...
      this.wastedEBs = Math.max(this.wastedEBs, 0);
    }
    this.generatedEBs += empowerEBs;
    this.wastedEBs += empowerEBsWasted;
  }

  statistic() {
    return (
      <Statistic
        position={STATISTIC_ORDER.CORE(1)}
        size="flexible"
        category={STATISTIC_CATEGORY.HERO_TALENTS}
      >
        <TalentSpellText talent={TALENTS.AFTERIMAGE_TALENT}>
          <div>
            <ItemDamageDone amount={this.afterimageDamage} />
          </div>
          <div>
            <Soup /> {Math.round(this.generatedEBs)}
            <small>
              {' '}
              <SpellLink spell={SPELLS.ESSENCE_BURST_BUFF} /> generated
            </small>
          </div>
          <div>
            <InformationIcon /> {Math.round(this.wastedEBs)}
            <small>
              {' '}
              <SpellLink spell={SPELLS.ESSENCE_BURST_BUFF} /> wasted
            </small>
          </div>
        </TalentSpellText>
      </Statistic>
    );
  }
}

export default Afterimage;
