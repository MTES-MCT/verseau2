export const compliantXml = `<?xml version="1.0" encoding="UTF-8"?>
<FctAssain  xsi:schemaLocation="http://xml.sandre.eaufrance.fr/scenario/fct_assain/4 http://xml.sandre.eaufrance.fr/scenario/fct_assain/4/sandre_sc_fct_assain.xsd" xmlns="http://xml.sandre.eaufrance.fr/scenario/fct_assain/4" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <Scenario>
        <CodeScenario>FCT_ASSAIN</CodeScenario>
        <VersionScenario>4</VersionScenario>
        <NomScenario>Scenario Test</NomScenario>
        <DateCreationFichier>2025-09-04</DateCreationFichier>
        <DateDebutReference>2024-01-01</DateDebutReference>
        <DateFinReference>2024-12-31</DateFinReference>
        <Emetteur>
            <CdIntervenant schemeAgencyID="SIRET">00000000000000</CdIntervenant>
            <NomIntervenant>Emetteur Test</NomIntervenant>
        </Emetteur>
        <Destinataire>
            <CdIntervenant schemeAgencyID="SIRET">00000000000000</CdIntervenant>
            <NomIntervenant>Destinataire Test</NomIntervenant>
            <RueIntervenant>Rue Test</RueIntervenant>
            <VilleIntervenant>Ville Test</VilleIntervenant>
        </Destinataire>
    </Scenario>
    <OuvrageDepollution>
        <CdOuvrageDepollution>codeOuvrageDepollution1</CdOuvrageDepollution>
        <TypeOuvrageDepollution>4</TypeOuvrageDepollution>
        <NomOuvrageDepollution>Ouvrage Test 1</NomOuvrageDepollution>
    </OuvrageDepollution>
    <OuvrageDepollution>
        <CdOuvrageDepollution>codeOuvrageDepollution2</CdOuvrageDepollution>
        <TypeOuvrageDepollution>4</TypeOuvrageDepollution>
        <NomOuvrageDepollution>Ouvrage Test 2</NomOuvrageDepollution>
        <Commune>
            <CdCommune>99999</CdCommune>
            <LbCommune>Commune Test</LbCommune>
        </Commune>
        <NatureSystTraitementEauxUsees>1</NatureSystTraitementEauxUsees>
        <PointMesure>
            <NumeroPointMesure>12345</NumeroPointMesure>
            <LbPointMesure>Point Mesure Test</LbPointMesure>
            <LocGlobalePointMesure>S7</LocGlobalePointMesure>
            <Prlvt>
                <DatePrlvt>2024-12-31</DatePrlvt>
                <Support>
                    <CdSupport>33</CdSupport>
                </Support>
                <Analyse>
                    <RsAnalyse>0</RsAnalyse>
                    <CdRemAnalyse>1</CdRemAnalyse>
                    <InSituAnalyse>1</InSituAnalyse>
                    <StatutRsAnalyse>A</StatutRsAnalyse>
                    <QualRsAnalyse>4</QualRsAnalyse>
                    <FractionAnalysee>
                        <CdFractionAnalysee>158</CdFractionAnalysee>
                    </FractionAnalysee>
                    <Parametre>
                        <CdParametre>1098</CdParametre>
                    </Parametre>
                    <UniteMesure>
                        <CdUniteMesure>115</CdUniteMesure>
                    </UniteMesure>
                    <FinaliteAnalyse>1</FinaliteAnalyse>
                </Analyse>
            </Prlvt>
        </PointMesure>
          <EvenOuvrageAssainissement>
            <DateEvenOuvrageAssainissement>2024-10-09</DateEvenOuvrageAssainissement>
            <TypeEvenOuvrageAssainissement>5</TypeEvenOuvrageAssainissement>
            <Finalite>1</Finalite>
            <DsEvenOuvrageAssainissement>Description Evenement Test 1</DsEvenOuvrageAssainissement>
        </EvenOuvrageAssainissement>
        <EvenOuvrageAssainissement>
            <DateEvenOuvrageAssainissement>2024-06-19</DateEvenOuvrageAssainissement>
            <TypeEvenOuvrageAssainissement>5</TypeEvenOuvrageAssainissement>
            <Finalite>1</Finalite>
            <DsEvenOuvrageAssainissement>Description Evenement Test 2</DsEvenOuvrageAssainissement>
        </EvenOuvrageAssainissement>
          </OuvrageDepollution>
       <SystemeCollecte>
        <CdSystemeCollecte>SANDRE_SYSTEME_1</CdSystemeCollecte>
        <LbSystemeCollecte>Systeme Collecte Test</LbSystemeCollecte>
        <PointMesure>
            <NumeroPointMesure>TP_TEST</NumeroPointMesure>
            <LbPointMesure>Point Mesure Systeme Test</LbPointMesure>
            <LocGlobalePointMesure>R1</LocGlobalePointMesure>
            <Prlvt>
                <DatePrlvt>2024-01-01</DatePrlvt>
                <Support>
                    <CdSupport>3</CdSupport>
                </Support>
                <Analyse>
                    <RsAnalyse>13</RsAnalyse>
                    <CdRemAnalyse>1</CdRemAnalyse>
                    <InSituAnalyse>1</InSituAnalyse>
                    <StatutRsAnalyse>A</StatutRsAnalyse>
                    <QualRsAnalyse>4</QualRsAnalyse>
                    <FractionAnalysee>
                        <CdFractionAnalysee>23</CdFractionAnalysee>
                    </FractionAnalysee>
                    <Parametre>
                        <CdParametre>1553</CdParametre>
                    </Parametre>
                    <UniteMesure>
                        <CdUniteMesure>184</CdUniteMesure>
                    </UniteMesure>
                    <FinaliteAnalyse>1</FinaliteAnalyse>
                </Analyse>
            </Prlvt>
        </PointMesure>
    </SystemeCollecte>
</FctAssain>`;
