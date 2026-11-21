// File purpose: HUB Food's screen addresses (#food/..., #restaurant/..., #food-admin/...). The code now lives in the shared
// section router so the store and Bills navigate the same way; Food screens keep importing from here.
export { enterSection, goTo, leaveSection, sectionPath, useSectionHistory, sectionDepth as foodDepth } from '../../shared/layout/sectionRoute'
